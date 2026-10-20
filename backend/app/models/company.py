from typing import List, Optional
from pydantic import BaseModel, Field


class SkillRequirement(BaseModel):
    name: str
    min_proficiency: int = Field(default=3, ge=1, le=5)
    weight: float = Field(default=1.0, ge=0.5, le=5.0)


class CompanyBase(BaseModel):
    company_id: str
    name: str
    tier: int = Field(ge=1, le=5)
    tagline: str
    logo_icon: str = "Building"  # Lucide icon identifier
    color_gradient: str = "from-blue-600 to-indigo-600"
    roles_hiring: List[str] = []
    required_skills: List[SkillRequirement] = []
    nice_to_have_skills: List[str] = []
    interview_style: str
    difficulty: str = "Medium"  # Easy, Medium, Hard, Legendary
    unlock_threshold_score: int = Field(default=60, ge=30, le=95)
    xp_reward: int = 250


class CompanyResponse(CompanyBase):
    pass


class MatchedSkillDetail(BaseModel):
    name: str
    candidate_prof: int
    required_prof: int
    weight: float
    points_earned: float
    max_points: float


class MissingSkillDetail(BaseModel):
    name: str
    candidate_prof: int
    required_prof: int
    weight: float
    points_gap: float
    impact_percentage: float  # how much unlocking this will boost score


class CompanyUnlockStatus(BaseModel):
    company_id: str
    company_name: str
    tier: int
    status: str  # "LOCKED", "UNLOCKED", "COMPLETED"
    match_score: float
    unlock_threshold_score: int
    is_unlocked: bool
    is_completed: bool
    matched_skills: List[MatchedSkillDetail] = []
    missing_skills: List[MissingSkillDetail] = []
    nice_to_have_matches: List[str] = []
    explanation: str = ""


class CompanyWithStatus(CompanyResponse):
    unlock_status: CompanyUnlockStatus
