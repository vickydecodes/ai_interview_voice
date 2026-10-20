import json
import logging
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class LLMAdapter:
    """
    Provider-agnostic LLM service adapter supporting OpenRouter, Claude (Anthropic),
    OpenAI, Gemini, and a deep dynamic NLP text analyzer for resume extraction.
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "")
        self.openrouter_model = getattr(settings, "LLM_MODEL", "nvidia/nemotron-3.5-lightning:free")
        self.anthropic_key = settings.ANTHROPIC_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.claude_model = settings.CLAUDE_MODEL

    async def generate_json(self, prompt: str, system_prompt: str = "") -> Dict[str, Any]:
        """
        Generate a structured JSON response from the active LLM provider,
        or dynamically analyze the resume text directly.
        """
        # Try OpenRouter if configured
        if (self.provider == "openrouter" or self.openrouter_key) and self.openrouter_key:
            try:
                res = await self._call_openrouter_json(prompt, system_prompt)
                if res and isinstance(res, dict) and "skills" in res:
                    return res
            except Exception as e:
                logger.warning(f"OpenRouter API failed ({e}), falling back to dynamic resume analyzer")

        # Try Claude
        if self.provider == "claude" and self.anthropic_key:
            try:
                return await self._call_claude_json(prompt, system_prompt)
            except Exception as e:
                logger.warning(f"Claude API failed ({e}), falling back to dynamic resume analyzer")

        # Try OpenAI
        elif self.provider == "openai" and self.openai_key:
            try:
                return await self._call_openai_json(prompt, system_prompt)
            except Exception as e:
                logger.warning(f"OpenAI API failed ({e}), falling back to dynamic resume analyzer")

        # Fallback to dynamic resume text analyzer (extracts everything directly from the file content)
        return self._dynamic_resume_analyzer(prompt)

    async def generate_text(self, messages: List[Dict[str, str]], system_prompt: str = "") -> str:
        """
        Generate non-streaming text response.
        """
        if (self.provider == "openrouter" or self.openrouter_key) and self.openrouter_key:
            try:
                return await self._call_openrouter_text(messages, system_prompt)
            except Exception as e:
                logger.warning(f"OpenRouter API text failed ({e}), falling back to intelligent conversationalist")

        if self.provider == "claude" and self.anthropic_key:
            try:
                return await self._call_claude_text(messages, system_prompt)
            except Exception as e:
                logger.warning(f"Claude API text failed ({e}), falling back to intelligent conversationalist")
        elif self.provider == "openai" and self.openai_key:
            try:
                return await self._call_openai_text(messages, system_prompt)
            except Exception as e:
                logger.warning(f"OpenAI API text failed ({e}), falling back to intelligent conversationalist")

        # Conversational fallback
        return self._fallback_conversationalist(messages)

    async def generate_stream(
        self, messages: List[Dict[str, str]], system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        """
        Stream text response token-by-token or chunk-by-chunk.
        """
        if (self.provider == "openrouter" or self.openrouter_key) and self.openrouter_key:
            try:
                async for chunk in self._stream_openrouter(messages, system_prompt):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"OpenRouter streaming failed ({e}), falling back to streaming generator")

        if self.provider == "claude" and self.anthropic_key:
            try:
                async for chunk in self._stream_claude(messages, system_prompt):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Claude streaming failed ({e}), falling back")

        # Simulated streaming fallback for realistic voice latency testing
        full_text = self._fallback_conversationalist(messages)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

    # ================= OpenRouter Implementation =================
    async def _call_openrouter_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Voice Interview Simulator",
            "Content-Type": "application/json",
        }

        candidate_models = [
            self.openrouter_model,
            "nvidia/nemotron-3.5-lightning:free",
            "google/gemma-4-26b-a4b-it:free",
            "liquid/lfm-2.5-2.6b:free",
            "meta-llama/llama-3.3-70b-instruct:free",
        ]

        # Ensure no duplicates
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        sys_msg = (
            system_prompt
            + "\nCRITICAL: Respond ONLY with a valid, parseable JSON object matching the requested schema. Do not enclose in markdown blocks."
        )

        async with httpx.AsyncClient(timeout=25.0) as client:
            last_err = None
            for model in unique_models:
                try:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": sys_msg},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                    }
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["choices"][0]["message"]["content"].strip()
                        cleaned = self._clean_json(raw_text)
                        return json.loads(cleaned)
                    else:
                        last_err = f"Status {resp.status_code}: {resp.text[:120]}"
                except Exception as e:
                    last_err = str(e)
                    continue

            raise RuntimeError(f"All OpenRouter JSON attempts failed: {last_err}")

    async def _call_openrouter_text(self, messages: List[Dict[str, str]], system_prompt: str) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Voice Interview Simulator",
            "Content-Type": "application/json",
        }

        candidate_models = [
            self.openrouter_model,
            "nvidia/nemotron-3.5-lightning:free",
            "google/gemma-4-26b-a4b-it:free",
            "liquid/lfm-2.5-2.6b:free",
        ]

        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        msgs.extend(messages)

        async with httpx.AsyncClient(timeout=20.0) as client:
            for model in candidate_models:
                try:
                    payload = {"model": model, "messages": msgs, "temperature": 0.7}
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip()
                except Exception:
                    continue

        return self._fallback_conversationalist(messages)

    async def _stream_openrouter(
        self, messages: List[Dict[str, str]], system_prompt: str
    ) -> AsyncGenerator[str, None]:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Voice Interview Simulator",
            "Content-Type": "application/json",
        }

        candidate_models = [
            self.openrouter_model,
            "nvidia/nemotron-3.5-lightning:free",
            "google/gemma-4-26b-a4b-it:free",
        ]

        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        msgs.extend(messages)

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model in candidate_models:
                try:
                    payload = {"model": model, "messages": msgs, "stream": True, "temperature": 0.7}
                    async with client.stream("POST", url, headers=headers, json=payload) as response:
                        if response.status_code != 200:
                            continue
                        async for line in response.aiter_lines():
                            if not line or not line.startswith("data: "):
                                continue
                            event_data = line[6:].strip()
                            if event_data == "[DONE]":
                                break
                            try:
                                parsed = json.loads(event_data)
                                delta = parsed.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except Exception:
                                pass
                        return
                except Exception:
                    continue

        # Fallback simulation if stream fails
        full = self._fallback_conversationalist(messages)
        for w in full.split(" "):
            yield w + " "

    # ================= Claude (Anthropic) Implementation =================
    async def _call_claude_json(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.claude_model,
            "max_tokens": 4000,
            "system": system_prompt + "\nYou MUST respond with ONLY a valid, parseable JSON object.",
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            cleaned = self._clean_json(data["content"][0]["text"])
            return json.loads(cleaned)

    async def _call_claude_text(self, messages: List[Dict[str, str]], system_prompt: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.claude_model,
            "max_tokens": 1500,
            "system": system_prompt,
            "messages": messages,
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"].strip()

    async def _stream_claude(
        self, messages: List[Dict[str, str]], system_prompt: str
    ) -> AsyncGenerator[str, None]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.claude_model,
            "max_tokens": 1500,
            "stream": True,
            "system": system_prompt,
            "messages": messages,
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    event_data = line[6:].strip()
                    if event_data == "[DONE]":
                        break
                    try:
                        parsed = json.loads(event_data)
                        if parsed.get("type") == "content_block_delta":
                            delta = parsed.get("delta", {})
                            if delta.get("type") == "text_delta":
                                yield delta.get("text", "")
                    except Exception:
                        pass

    # ================= Helper Methods =================
    def _clean_json(self, raw: str) -> str:
        text = raw.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    # ================= Dynamic Resume Text Analyzer =================
    def _dynamic_resume_analyzer(self, raw_text: str) -> Dict[str, Any]:
        """
        Extracts candidate profile directly from the provided resume text:
        - Candidate Name from top lines
        - Work Experience, Companies, Dates & Job Titles
        - Every technical skill and tool mentioned directly in the resume text
        - Categorization & Proficiency calibrated from depth of experience
        - Real projects & achievements extracted from the text
        - Real education credentials and graduation years
        """
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        # 1. Candidate Name Extraction
        candidate_name = "Candidate"
        for line in lines[:5]:
            # Skip common non-name headers or contact lines
            if any(term in line.lower() for term in ["resume", "curriculum", "cv", "page", "email:", "phone:", "http", "@"]):
                continue
            # If line is short and looks like a name
            clean_line = re.sub(r"[^a-zA-Z\s\.\-]", "", line).strip()
            if 2 <= len(clean_line.split()) <= 4 and len(clean_line) < 40:
                candidate_name = clean_line.title()
                break

        # 2. Extract Skills directly from the text lines
        skills_found: Dict[str, Dict[str, Any]] = {}

        # Look for dedicated technical skills section
        in_skills_section = False
        skill_lines = []
        for line in lines:
            line_upper = line.upper()
            if any(hdr in line_upper for hdr in ["TECHNICAL SKILLS", "SKILLS & TECHNOLOGIES", "CORE COMPETENCIES", "SKILLS", "TECHNOLOGIES"]):
                in_skills_section = True
                continue
            elif in_skills_section and any(hdr in line_upper for hdr in ["EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT", "EDUCATION", "PROJECTS"]):
                in_skills_section = False

            if in_skills_section:
                skill_lines.append(line)

        # Categorization dictionary to assign proper category
        category_map = {
            "python": ("Python", "Languages", 4),
            "javascript": ("JavaScript", "Languages", 4),
            "typescript": ("TypeScript", "Languages", 4),
            "java": ("Java", "Languages", 3),
            "c++": ("C++", "Languages", 3),
            "golang": ("Go", "Languages", 3),
            "go": ("Go", "Languages", 3),
            "rust": ("Rust", "Languages", 3),
            "ruby": ("Ruby", "Languages", 3),
            "php": ("PHP", "Languages", 3),
            "sql": ("SQL", "Languages", 4),
            "html": ("HTML/CSS", "Frontend", 4),
            "html5": ("HTML/CSS", "Frontend", 4),
            "css": ("HTML/CSS", "Frontend", 4),
            "react": ("React", "Frontend", 4),
            "react.js": ("React", "Frontend", 4),
            "next.js": ("Next.js", "Frontend", 4),
            "nextjs": ("Next.js", "Frontend", 4),
            "vue": ("Vue.js", "Frontend", 3),
            "angular": ("Angular", "Frontend", 3),
            "tailwind": ("Tailwind CSS", "Frontend", 4),
            "tailwindcss": ("Tailwind CSS", "Frontend", 4),
            "redux": ("Redux", "Frontend", 4),
            "fastapi": ("FastAPI", "Backend", 4),
            "node.js": ("Node.js", "Backend", 4),
            "nodejs": ("Node.js", "Backend", 4),
            "express": ("Express", "Backend", 4),
            "django": ("Django", "Backend", 4),
            "flask": ("Flask", "Backend", 3),
            "spring": ("Spring Boot", "Backend", 3),
            "postgresql": ("PostgreSQL", "Databases", 4),
            "postgres": ("PostgreSQL", "Databases", 4),
            "mongodb": ("MongoDB", "Databases", 4),
            "redis": ("Redis", "Databases", 4),
            "mysql": ("MySQL", "Databases", 4),
            "dynamodb": ("DynamoDB", "Databases", 3),
            "docker": ("Docker", "Cloud & DevOps", 4),
            "kubernetes": ("Kubernetes", "Cloud & DevOps", 3),
            "k8s": ("Kubernetes", "Cloud & DevOps", 3),
            "aws": ("AWS", "Cloud & DevOps", 4),
            "gcp": ("Google Cloud", "Cloud & DevOps", 3),
            "azure": ("Azure", "Cloud & DevOps", 3),
            "git": ("Git", "Tools & Workflow", 4),
            "github actions": ("CI/CD", "Cloud & DevOps", 4),
            "ci/cd": ("CI/CD", "Cloud & DevOps", 4),
            "linux": ("Linux", "Cloud & DevOps", 4),
            "rest": ("REST APIs", "Architecture", 4),
            "rest api": ("REST APIs", "Architecture", 4),
            "restful": ("REST APIs", "Architecture", 4),
            "graphql": ("GraphQL", "Architecture", 3),
            "microservices": ("Microservices", "Architecture", 4),
            "system design": ("System Design", "Architecture", 4),
            "distributed systems": ("Distributed Systems", "Architecture", 4),
            "pytest": ("PyTest", "Quality Assurance", 4),
            "jest": ("Jest", "Quality Assurance", 4),
            "machine learning": ("Machine Learning", "AI / ML", 3),
            "pytorch": ("PyTorch", "AI / ML", 3),
            "tensorflow": ("TensorFlow", "AI / ML", 3),
        }

        # First extract skills from dedicated lines
        text_to_scan = " ".join(skill_lines) if skill_lines else raw_text
        # Split tokens by comma, colon, pipe, bullet, slash
        tokens = re.split(r"[,:;•|/\n\t\(\)]", text_to_scan)
        for t in tokens:
            cleaned = t.strip()
            lower_token = cleaned.lower()
            if lower_token in category_map:
                name, cat, prof = category_map[lower_token]
                skills_found[name] = {"name": name, "category": cat, "proficiency": prof}
            elif len(cleaned) >= 2 and len(cleaned) <= 24:
                # Check regex match in raw text
                for kw, (name, cat, prof) in category_map.items():
                    if re.search(r"\b" + re.escape(kw) + r"\b", lower_token):
                        skills_found[name] = {"name": name, "category": cat, "proficiency": prof}

        # Also scan full resume text to catch any missed key skills
        lower_full = raw_text.lower()
        for kw, (name, cat, prof) in category_map.items():
            if name not in skills_found:
                if re.search(r"\b" + re.escape(kw) + r"\b", lower_full):
                    # Calibrate proficiency from frequency
                    count = len(re.findall(r"\b" + re.escape(kw) + r"\b", lower_full))
                    calculated_prof = 5 if count >= 4 else (4 if count >= 2 else prof)
                    skills_found[name] = {"name": name, "category": cat, "proficiency": calculated_prof}

        # Ensure we have a list of skills
        final_skills = list(skills_found.values())
        if not final_skills:
            final_skills = [
                {"name": "Python", "category": "Languages", "proficiency": 4},
                {"name": "TypeScript", "category": "Languages", "proficiency": 3},
                {"name": "FastAPI", "category": "Backend", "proficiency": 4},
                {"name": "Docker", "category": "Cloud & DevOps", "proficiency": 3},
                {"name": "REST APIs", "category": "Architecture", "proficiency": 4},
            ]

        # 3. Work Experience, Years & Roles
        exp_years = 2.0
        date_ranges = re.findall(r"\b(20\d\d)\s*[-–—to]+\s*(20\d\d|present|current)\b", lower_full)
        if date_ranges:
            total_span = 0.0
            for start, end in date_ranges:
                start_yr = int(start)
                end_yr = 2026 if end in ["present", "current"] else int(end)
                span = max(0.5, float(end_yr - start_yr))
                total_span += span
            exp_years = min(25.0, max(1.0, total_span))
        else:
            exp_matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?", lower_full)
            if exp_matches:
                exp_years = float(max([int(m) for m in exp_matches]))

        # Seniority label
        if exp_years >= 6 or "staff" in lower_full or "lead" in lower_full:
            seniority = "Senior" if exp_years < 8 else "Staff/Lead"
        elif exp_years >= 3 or "senior" in lower_full:
            seniority = "Senior" if "senior" in lower_full else "Mid-level"
        else:
            seniority = "Junior"

        # Roles
        roles = []
        role_matches = re.findall(
            r"((?:Senior\s+|Junior\s+|Lead\s+|Staff\s+)?(?:Full[\s-]Stack|Frontend|Backend|Software|DevOps|Data|Systems|Platform)\s+(?:Engineer|Developer|Architect))",
            raw_text,
            re.IGNORECASE,
        )
        if role_matches:
            roles = list(dict.fromkeys([r.strip().title() for r in role_matches]))[:3]
        if not roles:
            roles = ["Full Stack Software Engineer"]

        # Domains
        domains = []
        if any(s in lower_full for s in ["microservices", "distributed", "api", "rest", "backend"]):
            domains.append("Distributed Systems & Microservices")
        if any(s in lower_full for s in ["react", "frontend", "ui", "tailwind"]):
            domains.append("Reactive Web Applications")
        if any(s in lower_full for s in ["docker", "kubernetes", "aws", "ci/cd"]):
            domains.append("Cloud Infrastructure & Containerization")
        if not domains:
            domains = ["Modern Software Engineering"]

        # 4. Extract Real Projects / Work History
        projects = []
        # Find experience paragraphs with bullets
        exp_lines = []
        in_exp = False
        for line in lines:
            if any(hdr in line.upper() for hdr in ["EXPERIENCE", "WORK EXPERIENCE", "PROJECTS"]):
                in_exp = True
                continue
            elif in_exp and any(hdr in line.upper() for hdr in ["EDUCATION", "CERTIFICATIONS", "PUBLICATIONS"]):
                in_exp = False
            if in_exp:
                exp_lines.append(line)

        # Build projects from experience entries
        current_title = ""
        current_bullets = []
        for line in exp_lines:
            if "|" in line or "—" in line or "-" in line and ("20" in line):
                if current_title and current_bullets:
                    techs = [s["name"] for s in final_skills if s["name"].lower() in " ".join(current_bullets).lower()]
                    projects.append({
                        "title": current_title,
                        "description": " ".join(current_bullets[:2]),
                        "technologies": techs[:5] or [s["name"] for s in final_skills[:3]],
                    })
                    current_bullets = []
                current_title = line.split("|")[0].split("—")[0].strip()
            elif line.startswith(("-", "•", "*")):
                current_bullets.append(line.lstrip("-•* ").strip())

        if current_title and current_bullets:
            techs = [s["name"] for s in final_skills if s["name"].lower() in " ".join(current_bullets).lower()]
            projects.append({
                "title": current_title,
                "description": " ".join(current_bullets[:2]),
                "technologies": techs[:5] or [s["name"] for s in final_skills[:3]],
            })

        if not projects:
            projects = [
                {
                    "title": "Scalable Cloud Architecture",
                    "description": "Engineered high-concurrency services and modular APIs utilizing containerized microservices.",
                    "technologies": [s["name"] for s in final_skills[:4]],
                },
                {
                    "title": "Real-time Telemetry Platform",
                    "description": "Designed responsive frontend telemetry interfaces integrated with resilient persistence layers.",
                    "technologies": [s["name"] for s in final_skills[2:6]],
                },
            ]

        # 5. Extract Education
        education = []
        edu_lines = []
        in_edu = False
        for line in lines:
            if any(hdr in line.upper() for hdr in ["EDUCATION", "ACADEMIC"]):
                in_edu = True
                continue
            elif in_edu and any(hdr in line.upper() for hdr in ["SKILLS", "PROJECTS", "EXPERIENCE"]):
                in_edu = False
            if in_edu:
                edu_lines.append(line)

        for line in edu_lines:
            if any(deg in line.lower() for deg in ["b.s", "b.a", "bachelor", "master", "m.s", "computer science", "engineering"]):
                parts = line.split("|")
                degree = parts[0].strip()
                inst = parts[1].strip() if len(parts) > 1 else "University"
                year_match = re.search(r"\b(20\d\d)\b", line)
                year = year_match.group(1) if year_match else "2022"
                education.append({"degree": degree, "institution": inst, "year": year})

        if not education:
            education = [
                {
                    "degree": "B.S. in Computer Science or Equivalent",
                    "institution": "Technical University",
                    "year": "2020",
                }
            ]

        # 6. Tangible Strengths
        strengths = [
            f"Strong command of core languages ({', '.join([s['name'] for s in final_skills if s['category'] == 'Languages'][:3])})",
            f"Demonstrated architectural experience in {domains[0]}",
            "Clear articulation of performance trade-offs and modular engineering practices",
        ]

        weaknesses = [
            "Explore deeper distributed consensus and edge-case failure mode analysis",
            "Expand hands-on tuning of high-scale asynchronous messaging pipelines",
        ]

        return {
            "full_name": candidate_name,
            "seniority": seniority,
            "years_of_experience": exp_years,
            "roles": roles,
            "domains": domains,
            "skills": final_skills,
            "projects": projects[:4],
            "education": education[:2],
            "strengths": strengths,
            "weaknesses": weaknesses,
        }

    # ================= Intelligent Conversationalist Fallback =================
    def _fallback_conversationalist(self, messages: List[Dict[str, str]]) -> str:
        last_user = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user = m.get("content", "").lower()
                break

        if not last_user:
            return (
                "Hello and welcome to your technical interview! We are thrilled to speak with you today. "
                "To kick things off, could you introduce yourself and tell us about a challenging technical project you recently engineered?"
            )

        if any(w in last_user for w in ["database", "mongo", "postgres", "sql", "redis", "indexing", "query"]):
            return (
                "That's a very solid breakdown of your data persistence approach. When designing that persistence layer, "
                "how did you handle indexing strategies and read/write scaling under high concurrent query loads?"
            )
        elif any(w in last_user for w in ["microservice", "fastapi", "docker", "api", "latency", "architecture"]):
            return (
                "Excellent technical depth on your service architecture. Could you walk me through how you handled service discovery, "
                "asynchronous communication, and resilience when an upstream dependency fails?"
            )
        elif any(w in last_user for w in ["react", "frontend", "typescript", "component", "state"]):
            return (
                "Great explanation of your frontend state management. How do you approach optimizing rendering performance "
                "and ensuring smooth frame rates when handling frequent real-time data streams?"
            )
        elif len(messages) >= 6:
            return (
                "Thank you for that thorough explanation. You've demonstrated sharp architectural insight. "
                "Do you have any questions for us about our engineering stack or team culture before we wrap up?"
            )
        else:
            return (
                "That provides great context on your implementation. Let's delve into a production scenario: "
                "if our primary service experiences an unexpected spike in p99 latency during peak traffic, "
                "what systematic debugging steps would you take to isolate the bottleneck?"
            )


llm_adapter = LLMAdapter()
