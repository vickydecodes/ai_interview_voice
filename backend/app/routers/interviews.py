from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from bson import ObjectId

from app.database import get_interviews_collection, get_reports_collection
from app.services.auth_service import get_current_user
from app.models.interview import (
    StartInterviewRequest,
    AnswerRequest,
    InterviewSessionResponse,
    InterviewReportData,
)
from app.services.interview_service import (
    start_interview_session,
    stream_interview_reply,
    end_interview_and_generate_report,
)

router = APIRouter(prefix="/interviews", tags=["Voice Interviews"])


@router.post("/start", response_model=InterviewSessionResponse)
async def start_interview(
    payload: StartInterviewRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    return await start_interview_session(
        user_id=user_id,
        company_id=payload.company_id,
        role=payload.role,
    )


@router.get("/{interview_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    interviews_col = get_interviews_collection()
    session = await interviews_col.find_one({"_id": ObjectId(interview_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    return InterviewSessionResponse(
        interview_id=str(session["_id"]),
        company_id=session["company_id"],
        company_name=session["company_name"],
        role=session["role"],
        status=session.get("status", "in_progress"),
        messages=session.get("messages", []),
        current_question_index=session.get("current_question_index", 1),
        started_at=session["started_at"],
    )


@router.post("/{interview_id}/answer")
async def answer_interview_question(
    interview_id: str,
    payload: AnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    generator = stream_interview_reply(
        interview_id=interview_id,
        user_id=user_id,
        user_answer=payload.message,
    )
    return StreamingResponse(generator, media_type="text/plain")


@router.post("/{interview_id}/end", response_model=InterviewReportData)
async def end_interview(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    return await end_interview_and_generate_report(
        interview_id=interview_id,
        user_id=user_id,
    )


@router.get("/{interview_id}/report", response_model=InterviewReportData)
async def get_interview_report(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    reports_col = get_reports_collection()
    report = await reports_col.find_one({"interview_id": interview_id})
    if not report:
        # Check if interview exists and generate if completed
        interviews_col = get_interviews_collection()
        session = await interviews_col.find_one({"_id": ObjectId(interview_id), "user_id": user_id})
        if session:
            return await end_interview_and_generate_report(interview_id, user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    return InterviewReportData(**report)
