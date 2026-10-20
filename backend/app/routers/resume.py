from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from bson import ObjectId

from app.database import get_resumes_collection, get_users_collection
from app.services.auth_service import get_current_user
from app.services.parser_service import extract_text_from_file, parse_resume_with_llm
from app.models.resume import (
    ParsedProfile,
    ResumeUploadResponse,
    ResumeProfileUpdateRequest,
)

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    
    # 1. Extract and sanitize text
    raw_text = await extract_text_from_file(file)

    # 2. Extract structured profile via LLM
    parsed_profile = await parse_resume_with_llm(raw_text)

    # If the resume has a candidate name and user didn't have one, update user profile
    if parsed_profile.full_name and parsed_profile.full_name != "Candidate":
        users_col = get_users_collection()
        await users_col.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"full_name": parsed_profile.full_name, "updated_at": datetime.now(timezone.utc)}}
        )

    # 3. Store in MongoDB
    resumes_col = get_resumes_collection()
    now = datetime.now(timezone.utc)
    resume_doc = {
        "user_id": user_id,
        "filename": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "file_size_bytes": file.size or len(raw_text),
        "raw_text": raw_text,
        "parsed_profile": parsed_profile.model_dump(),
        "created_at": now,
        "updated_at": now,
    }

    # Upsert latest resume for user
    existing = await resumes_col.find_one({"user_id": user_id})
    if existing:
        await resumes_col.update_one(
            {"_id": existing["_id"]},
            {"$set": resume_doc}
        )
        resume_id = str(existing["_id"])
    else:
        result = await resumes_col.insert_one(resume_doc)
        resume_id = str(result.inserted_id)

    return ResumeUploadResponse(
        message="Resume uploaded and parsed successfully.",
        resume_id=resume_id,
        parsed_profile=parsed_profile,
    )


@router.get("/profile", response_model=ParsedProfile)
async def get_parsed_profile(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    resumes_col = get_resumes_collection()
    resume = await resumes_col.find_one({"user_id": user_id})

    if not resume or "parsed_profile" not in resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume profile found for this candidate. Please upload your resume first."
        )

    return ParsedProfile(**resume["parsed_profile"])


@router.put("/profile", response_model=ParsedProfile)
async def update_parsed_profile(
    payload: ResumeProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    resumes_col = get_resumes_collection()
    resume = await resumes_col.find_one({"user_id": user_id})

    now = datetime.now(timezone.utc)
    if not resume:
        # Create an initial placeholder document
        resume_doc = {
            "user_id": user_id,
            "filename": "manual_entry.txt",
            "file_type": "text/plain",
            "file_size_bytes": 0,
            "raw_text": "Manual profile entry",
            "parsed_profile": payload.parsed_profile.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        await resumes_col.insert_one(resume_doc)
    else:
        await resumes_col.update_one(
            {"_id": resume["_id"]},
            {
                "$set": {
                    "parsed_profile": payload.parsed_profile.model_dump(),
                    "updated_at": now,
                }
            }
        )

    return payload.parsed_profile
