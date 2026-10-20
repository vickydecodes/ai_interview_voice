import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.database import get_recommendations_cache_collection
from app.models.company import CompanyUnlockStatus
from app.models.recommendation import SkillSuggestion, CompanyRecommendationsResponse
from app.adapters.llm_adapter import llm_adapter

logger = logging.getLogger(__name__)

# Curated actionable suggestions bank for rapid local fallback
SKILL_KNOWLEDGE_BANK: Dict[str, Dict[str, List[str]]] = {
    "system design": {
        "course_topics": [
            "Designing Data-Intensive Applications (Kleppmann) - Replication & Partitioning",
            "Consistent Hashing, Microservices Boundary Design & CAP Theorem trade-offs",
        ],
        "project_ideas": [
            "Build a distributed URL shortener or rate limiter with Redis cluster and PostgreSQL read-replicas.",
        ],
        "practice_tasks": [
            "Diagram an end-to-end event-driven architecture with Kafka for 100k requests/sec.",
            "Write a design document detailing database sharding vs tenant partitioning.",
        ],
    },
    "docker": {
        "course_topics": [
            "Multi-stage Docker builds, layer caching optimization, and Alpine base image security",
            "Container networking, bridge networks, and volume persistence patterns",
        ],
        "project_ideas": [
            "Containerize a full-stack polyglot app (React + FastAPI + Redis + Postgres) using production docker-compose.",
        ],
        "practice_tasks": [
            "Reduce a Python container image size from 1.2GB down to under 120MB using multi-stage builds.",
            "Configure health checks and non-root user execution in a Dockerfile.",
        ],
    },
    "kubernetes": {
        "course_topics": [
            "Kubernetes Core Primitives: Deployments, StatefulSets, Ingress, and DaemonSets",
            "Horizontal Pod Autoscalers (HPA), Resource Quotas, and Helm Chart Templating",
        ],
        "project_ideas": [
            "Deploy a zero-downtime microservice cluster on local Minikube/Kind with Ingress-NGINX and TLS.",
        ],
        "practice_tasks": [
            "Write a Helm chart with dynamic environment values and rolling-update strategy.",
            "Simulate node failure and observe pod rescheduling and readiness probe behavior.",
        ],
    },
    "aws": {
        "course_topics": [
            "AWS Solutions Architecture: VPC peering, IAM least-privilege roles, and ECS Fargate",
            "Serverless event pipelines with S3, Lambda, SQS, and CloudWatch metrics",
        ],
        "project_ideas": [
            "Provision a complete serverless document ingestion pipeline using AWS CDK / Terraform.",
        ],
        "practice_tasks": [
            "Create a secure VPC with private subnets, NAT Gateway, and an Application Load Balancer.",
            "Configure an S3 bucket with lifecycle rules and KMS customer-managed encryption.",
        ],
    },
    "redis": {
        "course_topics": [
            "Redis Data Structures: Hashes, Sorted Sets (ZSET), HyperLogLog, and Pub/Sub",
            "Caching Strategies: Cache-Aside, Write-Through, TTL Eviction policies, and Redis Sentinel",
        ],
        "project_ideas": [
            "Build a real-time multiplayer leaderboard with sliding-window rate limiting in Redis.",
        ],
        "practice_tasks": [
            "Implement distributed locking in Python using Redlock or SETNX with lease timeouts.",
            "Benchmark throughput comparing serialized JSON vs Redis Hashes.",
        ],
    },
    "postgresql": {
        "course_topics": [
            "PostgreSQL Performance: Index internals (B-tree, GIN, BRIN) and EXPLAIN ANALYZE deep dive",
            "ACID isolation levels, MVCC contention, row-level locking, and connection pooling",
        ],
        "project_ideas": [
            "Design an audit-logged financial ledger with composite constraints and partitioning.",
        ],
        "practice_tasks": [
            "Analyze a slow 500ms query with EXPLAIN ANALYZE and optimize it with covering indexes.",
            "Implement optimistic concurrency control using version timestamps.",
        ],
    },
    "graphql": {
        "course_topics": [
            "GraphQL Schema Definition (SDL), Resolvers, and the N+1 Query Problem",
            "DataLoader batching, query depth limiting, and persisted queries",
        ],
        "project_ideas": [
            "Build a federated GraphQL gateway combining user and product services with Strawberry or Apollo.",
        ],
        "practice_tasks": [
            "Implement a DataLoader pattern in Python/TypeScript to eliminate redundant database queries.",
            "Add rate limiting based on query complexity analysis.",
        ],
    },
    "ci/cd": {
        "course_topics": [
            "Automated Testing Gates, Linting, Security Scanning (SAST), and Artifact Versioning",
            "GitOps workflows, Canary deployments, and GitHub Actions matrix builds",
        ],
        "project_ideas": [
            "Construct an end-to-end GitHub Actions pipeline with automated semantic release and Docker push.",
        ],
        "practice_tasks": [
            "Configure branch protection rules requiring all integration tests and linters to pass.",
            "Write a rollback workflow triggered when production health checks fail.",
        ],
    },
    "machine learning": {
        "course_topics": [
            "LLM Orchestration: Retrieval-Augmented Generation (RAG), Embeddings, and Vector Databases",
            "Model Serving Latency, Batch Inference, and Quantization (vLLM, TensorRT)",
        ],
        "project_ideas": [
            "Build a production RAG application with hybrid search (BM25 + Dense embeddings) and streaming responses.",
        ],
        "practice_tasks": [
            "Implement semantic caching for repeated user prompts to reduce inference cost by 40%.",
            "Benchmark token generation throughput under concurrent user loads.",
        ],
    },
    "unit testing": {
        "course_topics": [
            "Test-Driven Development (TDD), Mocking, PyTest fixtures, and code coverage metrics",
            "Integration testing with Testcontainers and contract testing (Pact)",
        ],
        "project_ideas": [
            "Add a 90%+ branch-covered automated test suite for an existing RESTful API with ephemeral DB containers.",
        ],
        "practice_tasks": [
            "Write parameterized tests covering edge-case validation and authentication boundaries.",
            "Mock external HTTP API dependencies cleanly using respx or pytest-mock.",
        ],
    },
}


async def generate_skill_recommendations(
    company: Dict[str, Any],
    unlock_status: CompanyUnlockStatus,
) -> CompanyRecommendationsResponse:
    company_id = company.get("company_id")
    company_name = company.get("name")
    tier = int(company.get("tier", 1))
    threshold = int(company.get("unlock_threshold_score", 60))
    current_score = unlock_status.match_score
    score_gap = max(0.0, round(threshold - current_score, 1))
    is_unlocked = unlock_status.is_unlocked

    missing_skills = unlock_status.missing_skills
    if not missing_skills:
        return CompanyRecommendationsResponse(
            company_id=company_id,
            company_name=company_name,
            tier=tier,
            current_match_score=current_score,
            unlock_threshold_score=threshold,
            score_gap=0.0,
            is_unlocked=is_unlocked,
            recommendations=[],
            summary_advice="You meet or exceed all required skills for this company tier. Step directly into the voice interview room to prove your skills!",
        )

    cache_col = get_recommendations_cache_collection()
    recommendation_items: List[SkillSuggestion] = []

    # Process missing skills ordered by unlock impact
    for miss in missing_skills:
        skill_name = miss.name
        normalized_skill = skill_name.lower().strip()

        # Check cache in MongoDB
        cached_doc = await cache_col.find_one({"company_id": company_id, "skill_name": skill_name})

        if cached_doc and "course_topics" in cached_doc:
            recommendation_items.append(
                SkillSuggestion(
                    skill_name=skill_name,
                    current_proficiency=miss.candidate_prof,
                    required_proficiency=miss.required_prof,
                    impact_percentage=miss.impact_percentage,
                    course_topics=cached_doc.get("course_topics", []),
                    project_ideas=cached_doc.get("project_ideas", []),
                    practice_tasks=cached_doc.get("practice_tasks", []),
                )
            )
            continue

        # Check knowledge bank first for instantaneous response
        if normalized_skill in SKILL_KNOWLEDGE_BANK:
            bank_entry = SKILL_KNOWLEDGE_BANK[normalized_skill]
            suggestion = SkillSuggestion(
                skill_name=skill_name,
                current_proficiency=miss.candidate_prof,
                required_proficiency=miss.required_prof,
                impact_percentage=miss.impact_percentage,
                course_topics=bank_entry["course_topics"],
                project_ideas=bank_entry["project_ideas"],
                practice_tasks=bank_entry["practice_tasks"],
            )
            recommendation_items.append(suggestion)

            # Save in cache
            await cache_col.update_one(
                {"company_id": company_id, "skill_name": skill_name},
                {
                    "$set": {
                        "company_id": company_id,
                        "skill_name": skill_name,
                        "course_topics": bank_entry["course_topics"],
                        "project_ideas": bank_entry["project_ideas"],
                        "practice_tasks": bank_entry["practice_tasks"],
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
            continue

        # Otherwise query active LLM
        try:
            prompt = (
                f"Company: {company_name} (Tier {tier})\n"
                f"Target Role: {', '.join(company.get('roles_hiring', ['Software Engineer']))}\n"
                f"Missing Skill: {skill_name} (Candidate level: {miss.candidate_prof}/5, Required: {miss.required_prof}/5)\n\n"
                "Provide concrete, industry-grade learning recommendations in strict JSON with keys:\n"
                "- 'course_topics': array of 2 specific technical topics to study\n"
                "- 'project_ideas': array of 1 concrete portfolio project idea\n"
                "- 'practice_tasks': array of 2 actionable hands-on practice tasks"
            )
            system = "You are an elite technical mentor designing hyper-practical career progression roadmaps."
            llm_res = await llm_adapter.generate_json(prompt, system)

            suggestion = SkillSuggestion(
                skill_name=skill_name,
                current_proficiency=miss.candidate_prof,
                required_proficiency=miss.required_prof,
                impact_percentage=miss.impact_percentage,
                course_topics=llm_res.get("course_topics", [f"Core {skill_name} Architecture & Design Patterns"]),
                project_ideas=llm_res.get("project_ideas", [f"Build an end-to-end application integrating {skill_name}"]),
                practice_tasks=llm_res.get("practice_tasks", [f"Write a comprehensive test suite using {skill_name}"]),
            )
            recommendation_items.append(suggestion)

            # Cache
            await cache_col.update_one(
                {"company_id": company_id, "skill_name": skill_name},
                {
                    "$set": {
                        "company_id": company_id,
                        "skill_name": skill_name,
                        "course_topics": suggestion.course_topics,
                        "project_ideas": suggestion.project_ideas,
                        "practice_tasks": suggestion.practice_tasks,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"LLM suggestion generation error for {skill_name}: {e}")
            fallback_suggestion = SkillSuggestion(
                skill_name=skill_name,
                current_proficiency=miss.candidate_prof,
                required_proficiency=miss.required_prof,
                impact_percentage=miss.impact_percentage,
                course_topics=[f"Mastering {skill_name} in Production", f"Advanced {skill_name} Patterns & Scale"],
                project_ideas=[f"Implement a hands-on proof-of-concept demonstrating {skill_name} integration"],
                practice_tasks=[f"Benchmark performance and error handling with {skill_name}"],
            )
            recommendation_items.append(fallback_suggestion)

    summary_advice = (
        f"To unlock {company_name}, focus on {recommendation_items[0].skill_name} first "
        f"(+{recommendation_items[0].impact_percentage}% unlock boost). "
        f"Closing this gap will bridge your current {current_score}% match to the {threshold}% requirement."
    )

    return CompanyRecommendationsResponse(
        company_id=company_id,
        company_name=company_name,
        tier=tier,
        current_match_score=current_score,
        unlock_threshold_score=threshold,
        score_gap=score_gap,
        is_unlocked=is_unlocked,
        recommendations=recommendation_items,
        summary_advice=summary_advice,
    )
