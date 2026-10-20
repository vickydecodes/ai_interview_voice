from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import (
    get_companies_collection,
    get_resumes_collection,
    get_unlock_status_collection,
    get_interviews_collection,
)
from app.services.auth_service import get_current_user
from app.models.resume import ParsedProfile
from app.models.company import (
    CompanyResponse,
    CompanyUnlockStatus,
    CompanyWithStatus,
)
from app.services.unlock_engine import calculate_company_unlock

router = APIRouter(prefix="/companies", tags=["Companies & Level Map"])


async def get_candidate_profile(user_id: str) -> ParsedProfile:
    resumes_col = get_resumes_collection()
    resume_doc = await resumes_col.find_one({"user_id": user_id})
    if resume_doc and "parsed_profile" in resume_doc:
        return ParsedProfile(**resume_doc["parsed_profile"])
    # Default blank profile for candidates before upload
    return ParsedProfile(
        full_name="Candidate",
        seniority="Junior",
        years_of_experience=0.0,
        roles=["Software Engineer"],
        skills=[],
    )


@router.get("", response_model=List[CompanyResponse])
async def list_companies():
    companies_col = get_companies_collection()
    cursor = companies_col.find({}).sort([("tier", 1), ("unlock_threshold_score", 1)])
    companies = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        companies.append(CompanyResponse(**doc))
    return companies


@router.get("/map/overview", response_model=Dict[str, Any])
async def get_map_overview(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    profile = await get_candidate_profile(user_id)

    # Check completed interviews
    interviews_col = get_interviews_collection()
    completed_cursor = interviews_col.find({"user_id": user_id, "status": "completed"})
    completed_company_ids = set()
    async for interview in completed_cursor:
        if interview.get("company_id"):
            completed_company_ids.add(interview["company_id"])

    companies_col = get_companies_collection()
    unlock_col = get_unlock_status_collection()
    cursor = companies_col.find({}).sort([("tier", 1), ("unlock_threshold_score", 1)])

    companies_with_status: List[CompanyWithStatus] = []
    unlocked_count = 0
    total_companies = 0
    now = datetime.now(timezone.utc)

    async for doc in cursor:
        total_companies += 1
        is_completed = doc["company_id"] in completed_company_ids
        unlock_status = calculate_company_unlock(doc, profile, is_completed=is_completed)

        if unlock_status.is_unlocked:
            unlocked_count += 1

        # Cache or persist to unlock_status collection in MongoDB
        await unlock_col.update_one(
            {"user_id": user_id, "company_id": doc["company_id"]},
            {
                "$set": {
                    "user_id": user_id,
                    "company_id": doc["company_id"],
                    "match_score": unlock_status.match_score,
                    "status": unlock_status.status,
                    "is_unlocked": unlock_status.is_unlocked,
                    "missing_skills": [m.model_dump() for m in unlock_status.missing_skills],
                    "updated_at": now,
                }
            },
            upsert=True,
        )

        doc["_id"] = str(doc["_id"])
        comp_obj = CompanyWithStatus(
            company_id=doc["company_id"],
            name=doc["name"],
            tier=doc["tier"],
            tagline=doc["tagline"],
            logo_icon=doc.get("logo_icon", "Building"),
            color_gradient=doc.get("color_gradient", "from-blue-600 to-indigo-600"),
            roles_hiring=doc.get("roles_hiring", []),
            required_skills=doc.get("required_skills", []),
            nice_to_have_skills=doc.get("nice_to_have_skills", []),
            interview_style=doc.get("interview_style", ""),
            difficulty=doc.get("difficulty", "Medium"),
            unlock_threshold_score=doc.get("unlock_threshold_score", 60),
            xp_reward=doc.get("xp_reward", 250),
            unlock_status=unlock_status,
        )
        companies_with_status.append(comp_obj)

    has_uploaded_resume = bool(profile.skills and len(profile.skills) > 0)

    return {
        "candidate": {
            "name": profile.full_name or current_user.get("full_name", "Candidate"),
            "seniority": profile.seniority,
            "years_of_experience": profile.years_of_experience,
            "skills_count": len(profile.skills),
            "level": current_user.get("level", 1),
            "xp": current_user.get("xp", 0),
            "badges": current_user.get("badges", []),
            "has_uploaded_resume": has_uploaded_resume,
        },
        "stats": {
            "total_companies": total_companies,
            "unlocked_count": unlocked_count,
            "completed_count": len(completed_company_ids),
            "unlock_percentage": round((unlocked_count / total_companies) * 100, 1) if total_companies > 0 else 0,
        },
        "companies": [c.model_dump() for c in companies_with_status],
    }


@router.get("/{company_id}/status", response_model=CompanyUnlockStatus)
async def get_company_status(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    companies_col = get_companies_collection()
    company = await companies_col.find_one({"company_id": company_id})

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{company_id}' not found."
        )

    profile = await get_candidate_profile(user_id)

    # Check if completed
    interviews_col = get_interviews_collection()
    completed = await interviews_col.find_one({
        "user_id": user_id,
        "company_id": company_id,
        "status": "completed",
    })

    return calculate_company_unlock(company, profile, is_completed=bool(completed))
