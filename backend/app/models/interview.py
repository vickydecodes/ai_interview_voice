from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class InterviewMessage(BaseModel):
    role: str  # "assistant" | "user" | "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    question_type: Optional[str] = None  # "intro", "resume_deep_dive", "technical", "scenario", "behavioral", "company_specific"


class StartInterviewRequest(BaseModel):
    company_id: str
    role: Optional[str] = None


class AnswerRequest(BaseModel):
    message: str


class QuestionEval(BaseModel):
    question: str
    candidate_answer: str
    score: int = Field(ge=0, le=100)
    feedback: str
    suggested_answer: str


class InterviewReportData(BaseModel):
    interview_id: str
    company_id: str
    company_name: str
    role: str
    duration_minutes: float
    total_questions: int
    overall_score: int = Field(ge=0, le=100)
    selection_probability: int = Field(ge=0, le=100)
    communication_score: int = Field(ge=0, le=100)
    technical_depth_score: int = Field(ge=0, le=100)
    problem_solving_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    key_strengths: List[str] = []
    areas_for_improvement: List[str] = []
    question_evaluations: List[QuestionEval] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InterviewSessionResponse(BaseModel):
    interview_id: str
    company_id: str
    company_name: str
    role: str
    status: str  # "in_progress", "completed"
    messages: List[InterviewMessage] = []
    current_question_index: int = 1
    started_at: datetime
