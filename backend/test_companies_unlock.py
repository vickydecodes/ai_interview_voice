import asyncio
import httpx
from app.main import app
from app.database import connect_to_mongo, close_mongo_connection

async def test_unlock_engine():
    await connect_to_mongo()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Sarah Connor
        login_resp = await client.post("/auth/login", json={
            "email": "sarah@skynet.com",
            "password": "Cyberdyne123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get list of companies
        comp_resp = await client.get("/companies")
        assert comp_resp.status_code == 200, f"Failed to list companies: {comp_resp.text}"
        companies = comp_resp.json()
        assert len(companies) == 12, f"Expected 12 companies, got {len(companies)}"
        print(f" Listed {len(companies)} seeded companies across 5 tiers.")

        # 3. Get Map Overview with Live Unlock Statuses
        overview_resp = await client.get("/companies/map/overview", headers=headers)
        assert overview_resp.status_code == 200, f"Overview failed: {overview_resp.text}"
        data = overview_resp.json()
        
        assert "candidate" in data
        assert "stats" in data
        assert "companies" in data
        
        print(" Map Overview successfully computed for candidate:")
        print(f"   Candidate: {data['candidate']['name']} ({data['candidate']['seniority']})")
        print(f"   Unlocked: {data['stats']['unlocked_count']} / {data['stats']['total_companies']} companies ({data['stats']['unlock_percentage']}%)")

        # Verify specific tiers
        launchpad = next(c for c in data["companies"] if c["company_id"] == "launchpad-systems")
        cloudpulse = next(c for c in data["companies"] if c["company_id"] == "cloudpulse-metrics")
        apex_core = next(c for c in data["companies"] if c["company_id"] == "apex-quantum-core")

        print(f"   LaunchPad Systems (Tier 1): Match {launchpad['unlock_status']['match_score']}% -> Status: {launchpad['unlock_status']['status']}")
        print(f"   CloudPulse Metrics (Tier 2): Match {cloudpulse['unlock_status']['match_score']}% -> Status: {cloudpulse['unlock_status']['status']}")
        print(f"   Apex Quantum Core (Tier 5): Match {apex_core['unlock_status']['match_score']}% -> Status: {apex_core['unlock_status']['status']}")
        
        # Apex should be locked with missing skills
        assert apex_core["unlock_status"]["status"] == "LOCKED"
        assert len(apex_core["unlock_status"]["missing_skills"]) > 0
        top_missing = apex_core["unlock_status"]["missing_skills"][0]
        print(f"   Top missing skill for Apex Quantum: {top_missing['name']} (Impact: +{top_missing['impact_percentage']}%)")

        # 4. Test Single Company Status Endpoint
        status_resp = await client.get(f"/companies/{cloudpulse['company_id']}/status", headers=headers)
        assert status_resp.status_code == 200, f"Company status failed: {status_resp.text}"
        status_data = status_resp.json()
        assert status_data["company_id"] == "cloudpulse-metrics"
        print(f" GET /companies/cloudpulse-metrics/status passed!")

    await close_mongo_connection()
    print(" ALL UNLOCK ENGINE BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_unlock_engine())
