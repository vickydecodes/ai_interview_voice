from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class SkillItem(BaseModel):
    name: str
    proficiency: int = Field(default=3, ge=1, le=5, description="Skill proficiency rating from 1 to 5")
    category: Optional[str] = "General"


class ProjectItem(BaseModel):
    title: str
    description: str = ""
    technologies: List[str] = []


class EducationItem(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = ""


class ParsedProfile(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    seniority: str = "Mid-level"  # Junior, Mid-level, Senior, Staff/Lead
    years_of_experience: float = 0.0
    roles: List[str] = []
    domains: List[str] = []
    skills: List[SkillItem] = []
    projects: List[ProjectItem] = []
    education: List[EducationItem] = []
    strengths: List[str] = []
    weaknesses: List[str] = []


class ResumeDocument(BaseModel):
    id: Optional[str] = None
    user_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    raw_text: str
    parsed_profile: ParsedProfile
    created_at: datetime
    updated_at: datetime


class ResumeUploadResponse(BaseModel):
    message: str
    resume_id: str
    parsed_profile: ParsedProfile


class ResumeProfileUpdateRequest(BaseModel):
    parsed_profile: ParsedProfile
