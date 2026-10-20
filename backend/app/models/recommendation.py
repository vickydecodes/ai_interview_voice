from typing import List, Optional
from pydantic import BaseModel


class SkillSuggestion(BaseModel):
    skill_name: str
    current_proficiency: int
    required_proficiency: int
    impact_percentage: float
    course_topics: List[str] = []
    project_ideas: List[str] = []
    practice_tasks: List[str] = []


class CompanyRecommendationsResponse(BaseModel):
    company_id: str
    company_name: str
    tier: int
    current_match_score: float
    unlock_threshold_score: int
    score_gap: float
    is_unlocked: bool
    recommendations: List[SkillSuggestion] = []
    summary_advice: str = ""
