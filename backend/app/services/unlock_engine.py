from typing import List, Dict, Any, Tuple
from app.models.resume import ParsedProfile
from app.models.company import (
    CompanyUnlockStatus,
    MatchedSkillDetail,
    MissingSkillDetail,
)

# Canonical skill aliases for robust matching
SKILL_ALIASES: Dict[str, str] = {
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js",
    "ts": "typescript",
    "js": "javascript",
    "postgres": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "amazon web services": "aws",
    "ci / cd": "ci/cd",
    "cicd": "ci/cd",
    "rest": "rest apis",
    "rest api": "rest apis",
    "restful": "rest apis",
    "ml": "machine learning",
    "ai": "machine learning",
    "golang": "go",
    "unit test": "unit testing",
    "pytest": "unit testing",
    "jest": "unit testing",
}


def normalize_skill_name(name: str) -> str:
    cleaned = name.strip().lower()
    return SKILL_ALIASES.get(cleaned, cleaned)


def find_candidate_skill(candidate_skills: List[Dict[str, Any]], target_name: str) -> Tuple[bool, int]:
    target_norm = normalize_skill_name(target_name)
    for s in candidate_skills:
        s_name = s.get("name", "")
        if normalize_skill_name(s_name) == target_norm:
            return True, int(s.get("proficiency", 3))
    return False, 0


def calculate_company_unlock(
    company: Dict[str, Any],
    profile: ParsedProfile,
    is_completed: bool = False,
) -> CompanyUnlockStatus:
    candidate_skills = [s.model_dump() if hasattr(s, "model_dump") else dict(s) for s in profile.skills]
    years_exp = profile.years_of_experience or 0.0

    required_skills = company.get("required_skills", [])
    total_required_weight = sum(float(r.get("weight", 1.0)) for r in required_skills)
    if total_required_weight <= 0:
        total_required_weight = 1.0

    earned_weight = 0.0
    matched_details: List[MatchedSkillDetail] = []
    missing_details: List[MissingSkillDetail] = []

    for req in required_skills:
        req_name = req.get("name")
        req_prof = int(req.get("min_proficiency", 3))
        weight = float(req.get("weight", 1.0))

        has_skill, cand_prof = find_candidate_skill(candidate_skills, req_name)

        if has_skill:
            if cand_prof >= req_prof:
                # Full credit
                pts = weight * 1.0
                earned_weight += pts
                matched_details.append(
                    MatchedSkillDetail(
                        name=req_name,
                        candidate_prof=cand_prof,
                        required_prof=req_prof,
                        weight=weight,
                        points_earned=round(pts, 2),
                        max_points=weight,
                    )
                )
            else:
                # Partial credit for having the skill but lower proficiency
                pts = weight * (cand_prof / req_prof) * 0.75
                earned_weight += pts
                gap = weight - pts
                impact = round((gap / total_required_weight) * 100, 1)

                matched_details.append(
                    MatchedSkillDetail(
                        name=req_name,
                        candidate_prof=cand_prof,
                        required_prof=req_prof,
                        weight=weight,
                        points_earned=round(pts, 2),
                        max_points=weight,
                    )
                )
                missing_details.append(
                    MissingSkillDetail(
                        name=req_name,
                        candidate_prof=cand_prof,
                        required_prof=req_prof,
                        weight=weight,
                        points_gap=round(gap, 2),
                        impact_percentage=impact,
                    )
                )
        else:
            # Completely missing
            pts = 0.0
            gap = weight
            impact = round((gap / total_required_weight) * 100, 1)
            missing_details.append(
                MissingSkillDetail(
                    name=req_name,
                    candidate_prof=0,
                    required_prof=req_prof,
                    weight=weight,
                    points_gap=round(gap, 2),
                    impact_percentage=impact,
                )
            )

    # Base score strictly from core required skills
    base_score = (earned_weight / total_required_weight) * 100.0

    # Nice-to-have bonus (up to 6%)
    nice_to_haves = company.get("nice_to_have_skills", [])
    nice_matches: List[str] = []
    for nth in nice_to_haves:
        has_nth, _ = find_candidate_skill(candidate_skills, nth)
        if has_nth:
            nice_matches.append(nth)
    nice_bonus = min(6.0, len(nice_matches) * 2.0)

    # Experience bonus by tier (up to 4%)
    tier = int(company.get("tier", 1))
    tier_exp_reqs = {1: 0.5, 2: 2.0, 3: 3.5, 4: 5.0, 5: 6.5}
    expected_exp = tier_exp_reqs.get(tier, 2.0)
    exp_bonus = 4.0 if years_exp >= expected_exp else (2.0 if years_exp >= (expected_exp * 0.7) else 0.0)

    # Final deterministic match score
    final_score = min(100.0, round(base_score + nice_bonus + exp_bonus, 1))

    # Sort missing skills by impact descending (highest boost first)
    missing_details.sort(key=lambda x: x.impact_percentage, reverse=True)

    threshold = int(company.get("unlock_threshold_score", 60))
    is_unlocked = final_score >= threshold or is_completed

    if is_completed:
        status_str = "COMPLETED"
    elif is_unlocked:
        status_str = "UNLOCKED"
    else:
        status_str = "LOCKED"

    # Explainable rationale summary
    if is_unlocked:
        explanation = (
            f"You meet the requirements with a {final_score}% match score "
            f"(threshold: {threshold}%). Ready to begin interview."
        )
    else:
        diff = round(threshold - final_score, 1)
        top_missing = missing_details[0].name if missing_details else "additional skills"
        explanation = (
            f"Currently locked at {final_score}% (needs {threshold}%). "
            f"Gain +{diff}% by practicing {top_missing}."
        )

    return CompanyUnlockStatus(
        company_id=company.get("company_id"),
        company_name=company.get("name"),
        tier=tier,
        status=status_str,
        match_score=final_score,
        unlock_threshold_score=threshold,
        is_unlocked=is_unlocked,
        is_completed=is_completed,
        matched_skills=matched_details,
        missing_skills=missing_details,
        nice_to_have_matches=nice_matches,
        explanation=explanation,
    )
