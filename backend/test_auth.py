import asyncio
import httpx
from app.main import app
from app.database import connect_to_mongo, close_mongo_connection, get_users_collection

async def run_test():
    await connect_to_mongo()
    # Clean up test user if exists
    users_col = get_users_collection()
    await users_col.delete_one({"email": "testcandidate@example.com"})

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        resp = await client.get("/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print(" Health check passed:", resp.json())

        # 2. Register
        reg_payload = {
            "email": "testcandidate@example.com",
            "password": "Password123!",
            "full_name": "Alex Candidate"
        }
        reg_resp = await client.post("/auth/register", json=reg_payload)
        assert reg_resp.status_code == 201, f"Register failed: {reg_resp.text}"
        data = reg_resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "testcandidate@example.com"
        print(" Register passed: Token created for", data["user"]["full_name"])
        token = data["access_token"]

        # 3. Login
        login_resp = await client.post("/auth/login", json={
            "email": "testcandidate@example.com",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "access_token" in login_data
        print(" Login passed: Token refreshed")

        # 4. Get Current User (GET /auth/me)
        me_resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200, f"Me endpoint failed: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data["email"] == "testcandidate@example.com"
        assert me_data["level"] == 1
        print(" Get profile passed: User is Level", me_data["level"], "with badges", me_data["badges"])

    await close_mongo_connection()
    print(" ALL BACKEND AUTH TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_test())
