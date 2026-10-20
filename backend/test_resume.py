import asyncio
import io
import httpx
from app.main import app
from app.database import connect_to_mongo, close_mongo_connection, get_users_collection

SAMPLE_RESUME = """
ALEXANDER RIVERA
Email: alex.rivera@example.com | GitHub: github.com/alexrivera
Senior Full-Stack Software Engineer with 5+ years of experience designing scalable distributed web platforms.

EXPERIENCE:
Senior Full Stack Engineer | Apex Cloud Labs (2022 - Present)
- Architected high-concurrency microservices using Python, FastAPI, and Docker, handling 50k+ daily active requests.
- Built interactive real-time telemetry dashboards using React, TypeScript, and Tailwind CSS.
- Optimized persistence layer across PostgreSQL and MongoDB, reducing average query latency by 42%.
- Established automated CI/CD pipelines with GitHub Actions and containerized deployments to AWS ECS.

Software Engineer | DevMatrix Solutions (2020 - 2022)
- Developed RESTful APIs with Node.js and Express.
- Designed caching strategies using Redis, improving cache-hit ratios to 88%.
- Wrote extensive unit and integration tests using PyTest and Jest.

TECHNICAL SKILLS:
- Languages: Python, TypeScript, JavaScript, SQL, HTML/CSS
- Frameworks & Libraries: FastAPI, React, Node.js, Express, Tailwind CSS
- Databases & Storage: PostgreSQL, MongoDB, Redis
- Cloud & DevOps: Docker, Kubernetes, AWS, Git, CI/CD, Linux
- Architecture: REST APIs, Microservices, System Design, Distributed Systems

EDUCATION:
B.S. in Computer Science | State University (2016 - 2020)
"""

async def run_resume_test():
    await connect_to_mongo()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login to get token
        login_resp = await client.post("/auth/login", json={
            "email": "testcandidate@example.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload resume
        files = {"file": ("alex_rivera_resume.txt", io.BytesIO(SAMPLE_RESUME.encode("utf-8")), "text/plain")}
        upload_resp = await client.post("/resume/upload", files=files, headers=headers)
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        data = upload_resp.json()
        assert "parsed_profile" in data
        profile = data["parsed_profile"]
        assert len(profile["skills"]) > 0
        assert profile["years_of_experience"] >= 3.0
        print(" Resume upload passed!")
        print(f"   Candidate: {profile.get('full_name')} ({profile.get('seniority')})")
        print(f"   Experience: {profile.get('years_of_experience')} years")
        print(f"   Skills extracted ({len(profile['skills'])}): {[s['name'] for s in profile['skills'][:8]]}...")

        # 3. Get profile
        get_resp = await client.get("/resume/profile", headers=headers)
        assert get_resp.status_code == 200, f"Get profile failed: {get_resp.text}"
        assert get_resp.json()["full_name"] == profile["full_name"]
        print(" GET /resume/profile passed!")

        # 4. Update profile (add a new skill)
        profile["skills"].append({"name": "GraphQL", "proficiency": 4, "category": "Architecture"})
        put_resp = await client.put("/resume/profile", json={"parsed_profile": profile}, headers=headers)
        assert put_resp.status_code == 200, f"Update profile failed: {put_resp.text}"
        updated_skills = [s["name"] for s in put_resp.json()["skills"]]
        assert "GraphQL" in updated_skills
        print(" PUT /resume/profile passed: Added GraphQL skill successfully!")

    await close_mongo_connection()
    print(" ALL RESUME PARSER BACKEND TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(run_resume_test())
