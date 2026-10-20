import asyncio
import httpx
from app.main import app
from app.database import connect_to_mongo, close_mongo_connection

async def test_full_interview_flow():
    await connect_to_mongo()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_resp = await client.post("/auth/login", json={
            "email": "sarah@skynet.com",
            "password": "Cyberdyne123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Start Interview with LaunchPad Systems
        start_resp = await client.post(
            "/interviews/start",
            json={"company_id": "launchpad-systems"},
            headers=headers
        )
        assert start_resp.status_code == 200, f"Start interview failed: {start_resp.text}"
        session_data = start_resp.json()
        interview_id = session_data["interview_id"]
        print(f" Started Interview Session [{interview_id}] for {session_data['company_name']}")
        print(f"   Role: {session_data['role']}")
        print(f"   Opening Question: {session_data['messages'][0]['content'][:120]}...")

        # 3. Candidate Answers Question 1 (Streaming reply)
        cand_answer_1 = (
            "I recently designed and deployed an asynchronous microservice using Python and FastAPI. "
            "We containerized it using Docker and used MongoDB for persistence. One major challenge was "
            "handling high concurrency requests without degrading response times, so we introduced caching "
            "and connection pooling."
        )
        ans_resp = await client.post(
            f"/interviews/{interview_id}/answer",
            json={"message": cand_answer_1},
            headers=headers
        )
        assert ans_resp.status_code == 200, f"Answer failed: {ans_resp.text}"
        reply_1 = ans_resp.text
        assert len(reply_1) > 10
        print(f" AI Follow-Up Question: {reply_1[:120]}...")

        # 4. Candidate Answers Question 2
        cand_answer_2 = (
            "To optimize MongoDB query latency, we added compound indexes on tenant_id and timestamp, "
            "and optimized write throughput using bulk upserts. We also monitored slow queries using "
            "the MongoDB profiler, which reduced our p99 query latency from 320ms to 45ms."
        )
        ans_resp_2 = await client.post(
            f"/interviews/{interview_id}/answer",
            json={"message": cand_answer_2},
            headers=headers
        )
        assert ans_resp_2.status_code == 200
        reply_2 = ans_resp_2.text
        print(f" AI Next Question: {reply_2[:120]}...")

        # 5. End Interview & Generate Comprehensive Report
        end_resp = await client.post(
            f"/interviews/{interview_id}/end",
            headers=headers
        )
        assert end_resp.status_code == 200, f"End interview failed: {end_resp.text}"
        report = end_resp.json()
        assert report["overall_score"] > 0
        assert report["selection_probability"] > 0
        print(" Interview Feedback Report Generated:")
        print(f"   Overall Score: {report['overall_score']} / 100")
        print(f"   Selection Probability: {report['selection_probability']}%")
        print(f"   Communication: {report['communication_score']} | Technical Depth: {report['technical_depth_score']}")
        print(f"   Question Evals Count: {len(report['question_evaluations'])}")
        if report['question_evaluations']:
            print(f"   Sample Feedback: {report['question_evaluations'][0]['feedback'][:100]}...")

    await close_mongo_connection()
    print(" ALL INTERVIEW VOICE ASSISTANT TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_full_interview_flow())
