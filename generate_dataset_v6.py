"""
generate_dataset_v6.py

Production synthetic data generator for the AI Career Success Advisor platform.
Implements the approved Dataset V6 Architecture Blueprint:
  - 6-layer causal DAG (Identity -> Behavioral -> Skill -> Experience -> Mid-level Derived -> Outcome)
  - Latent-trait generative core for realistic correlation structure
  - Role-conditional weighting for employability scoring
  - Probabilistic (non-deterministic) role -> sector / role -> branch mappings
  - Market-demand and role-difficulty modulated placement probability
  - Anti-data-leakage enforcement (no downstream feature feeds an upstream one)
  - Full dataset validation, deduplication and reporting pipeline
"""

from __future__ import annotations

import argparse
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("dataset_v6")

# =============================================================================
# CONFIGURATION SECTION
# =============================================================================

DEFAULT_SEED: int = 42
DEFAULT_ROW_COUNT: int = 5000
OUTPUT_PATH: str = "dataset_v6.csv"

LATENT_FACTORS: List[str] = [
    "academic_aptitude",
    "technical_depth",
    "discipline",
    "ambition",
    "communication_polish",
    "domain_specialization_strength",
]

# Mild positive correlation across latent factors (generally capable students
# tend to be somewhat stronger across the board, but far from deterministic).
LATENT_CORRELATION: float = 0.15

DEGREES: List[str] = [
    "B.Tech/B.E.",
    "M.Tech/M.E.",
    "MCA",
    "BCA",
    "MSc",
    "PhD",
    "BS (Data Science & AI)",
]
DEGREE_WEIGHTS: List[float] = [0.38, 0.14, 0.12, 0.12, 0.10, 0.05, 0.09]

BRANCHES: List[str] = [
    "Computer Science",
    "Information Technology",
    "AI & Data Science",
    "Electronics & Communication",
    "Electronics & Instrumentation",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Robotics",
    "Civil Engineering",
    "Chemical Engineering",
    "Biotechnology",
    "Aerospace Engineering",
    "Automobile Engineering",
    "Mathematics & Computing",
    "Statistics",
    "Physics",
    "Chemistry",
    "Commerce",
    "Economics",
    "Business Administration",
    "Mass Communication",
    "Design",
    "Agricultural Engineering",
    "Textile Engineering",
    "Metallurgical Engineering",
    "Environmental Engineering",
    "Food Technology",
    "Pharmacy",
]

# Branches most naturally aligned with AI-native career paths; used to bias
# (not determine) role assignment for realistic cross-branch mobility.
CORE_TECH_BRANCHES: List[str] = [
    "Computer Science",
    "Information Technology",
    "AI & Data Science",
    "Mathematics & Computing",
    "Statistics",
    "Robotics",
    "Electronics & Communication",
]

SPECIALIZATION_TRACKS: List[str] = [
    "NLP",
    "Computer Vision",
    "Generative AI",
    "MLOps",
    "Robotics",
    "Classical ML",
    "Data Engineering",
    "Applied Research",
]

SECTORS: List[str] = [
    "AI/ML Product Companies",
    "GenAI Startups",
    "FinTech",
    "HealthTech",
    "Analytics/Data Services",
    "Research Labs/Academia",
    "Consulting",
    "Core Product Engineering",
    "Autonomous Systems/Robotics",
    "Government/PSU",
    "Freelance/Remote-Global",
]

GOALS: List[str] = [
    "Job Placement",
    "Higher Studies/Research",
    "Entrepreneurship/Startup",
    "Freelance/Remote Work",
    "Government Exams",
    "Career Switch/Upskilling",
]

# Sector growth weight: how "hot" a sector is for 2026+ AI hiring (0-1).
SECTOR_GROWTH_WEIGHT: Dict[str, float] = {
    "AI/ML Product Companies": 0.85,
    "GenAI Startups": 0.90,
    "FinTech": 0.65,
    "HealthTech": 0.70,
    "Analytics/Data Services": 0.60,
    "Research Labs/Academia": 0.55,
    "Consulting": 0.58,
    "Core Product Engineering": 0.50,
    "Autonomous Systems/Robotics": 0.68,
    "Government/PSU": 0.40,
    "Freelance/Remote-Global": 0.55,
}


@dataclass(frozen=True)
class RoleConfig:
    """Static configuration for a single career role."""
    name: str
    category: str  # core_ml_ai | specialized_ai | emerging_ai_adjacent | classic_tech
    primary_sector: str
    secondary_sector: str
    primary_branches: List[str]
    demand_index: float  # 0-1, market demand strength
    difficulty: float  # 0-1, bar of entry / competitiveness
    specialization_affinity: Optional[str] = None
    research_oriented: bool = False


ROLE_CATALOG: List[RoleConfig] = [
    # ---- Core ML/AI (~45% of assignment mass) ----
    RoleConfig("AI/ML Engineer", "core_ml_ai", "AI/ML Product Companies", "GenAI Startups",
               CORE_TECH_BRANCHES, 0.88, 0.62, "Classical ML"),
    RoleConfig("Data Scientist", "core_ml_ai", "Analytics/Data Services", "AI/ML Product Companies",
               CORE_TECH_BRANCHES + ["Statistics"], 0.80, 0.58, "Classical ML"),
    RoleConfig("Applied Scientist", "core_ml_ai", "AI/ML Product Companies", "Research Labs/Academia",
               CORE_TECH_BRANCHES, 0.72, 0.75, "Applied Research", research_oriented=True),
    RoleConfig("AI Research Scientist", "core_ml_ai", "Research Labs/Academia", "GenAI Startups",
               CORE_TECH_BRANCHES + ["Physics", "Mathematics & Computing"], 0.60, 0.90,
               "Applied Research", research_oriented=True),
    RoleConfig("MLOps Engineer", "core_ml_ai", "AI/ML Product Companies", "Core Product Engineering",
               CORE_TECH_BRANCHES, 0.75, 0.60, "MLOps"),
    RoleConfig("Data Engineer", "core_ml_ai", "Analytics/Data Services", "Core Product Engineering",
               CORE_TECH_BRANCHES, 0.78, 0.55, "Data Engineering"),
    RoleConfig("Analytics Engineer", "core_ml_ai", "Analytics/Data Services", "FinTech",
               CORE_TECH_BRANCHES, 0.70, 0.50, "Data Engineering"),
    RoleConfig("Data Analyst", "core_ml_ai", "Analytics/Data Services", "Consulting",
               BRANCHES, 0.65, 0.40, "Classical ML"),

    # ---- Specialized AI (~30%) ----
    RoleConfig("NLP Engineer", "specialized_ai", "GenAI Startups", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.78, 0.68, "NLP"),
    RoleConfig("Computer Vision Engineer", "specialized_ai", "Autonomous Systems/Robotics", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.72, 0.68, "Computer Vision"),
    RoleConfig("Generative AI Engineer", "specialized_ai", "GenAI Startups", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.90, 0.65, "Generative AI"),
    RoleConfig("Conversational AI Engineer", "specialized_ai", "AI/ML Product Companies", "GenAI Startups",
               CORE_TECH_BRANCHES, 0.68, 0.60, "NLP"),
    RoleConfig("Robotics Engineer", "specialized_ai", "Autonomous Systems/Robotics", "Core Product Engineering",
               ["Robotics", "Mechanical Engineering", "Electronics & Instrumentation", "Electrical Engineering"],
               0.62, 0.72, "Robotics"),
    RoleConfig("Reinforcement Learning Engineer", "specialized_ai", "Research Labs/Academia", "GenAI Startups",
               CORE_TECH_BRANCHES, 0.55, 0.85, "Applied Research", research_oriented=True),

    # ---- Emerging / AI-adjacent (~15%) ----
    RoleConfig("Prompt Engineer", "emerging_ai_adjacent", "GenAI Startups", "AI/ML Product Companies",
               BRANCHES, 0.70, 0.35, "Generative AI"),
    RoleConfig("AI Solutions Architect", "emerging_ai_adjacent", "Consulting", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.65, 0.62, "MLOps"),
    RoleConfig("AI Product Manager", "emerging_ai_adjacent", "AI/ML Product Companies", "Consulting",
               BRANCHES, 0.68, 0.55, None),
    RoleConfig("AI Ethics Specialist", "emerging_ai_adjacent", "Research Labs/Academia", "Government/PSU",
               BRANCHES, 0.45, 0.55, "Applied Research"),
    RoleConfig("AI Trainer RLHF Specialist", "emerging_ai_adjacent", "GenAI Startups", "AI/ML Product Companies",
               BRANCHES, 0.60, 0.35, "Generative AI"),
    RoleConfig("AI Transformation Consultant", "emerging_ai_adjacent", "Consulting", "Core Product Engineering",
               BRANCHES, 0.58, 0.45, None),

    # ---- Classic tech (~10%, retained for realism) ----
    RoleConfig("Software Engineer Backend", "classic_tech", "Core Product Engineering", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.60, 0.45, None),
    RoleConfig("Software Engineer Full Stack", "classic_tech", "Core Product Engineering", "Freelance/Remote-Global",
               CORE_TECH_BRANCHES, 0.58, 0.42, None),
    RoleConfig("Cloud DevOps Engineer", "classic_tech", "Core Product Engineering", "AI/ML Product Companies",
               CORE_TECH_BRANCHES, 0.62, 0.48, "MLOps"),
]

ROLE_BY_NAME: Dict[str, RoleConfig] = {r.name: r for r in ROLE_CATALOG}

CATEGORY_SELECTION_WEIGHTS: Dict[str, float] = {
    "core_ml_ai": 0.45,
    "specialized_ai": 0.30,
    "emerging_ai_adjacent": 0.15,
    "classic_tech": 0.10,
}

# Role-conditional employability weight profiles: (academic, technical, experience, presence, soft)
CATEGORY_WEIGHT_PROFILES: Dict[str, Dict[str, float]] = {
    "core_ml_ai": {"academic": 0.15, "technical": 0.30, "experience": 0.25, "presence": 0.15, "soft": 0.15},
    "specialized_ai": {"academic": 0.12, "technical": 0.35, "experience": 0.28, "presence": 0.15, "soft": 0.10},
    "emerging_ai_adjacent": {"academic": 0.10, "technical": 0.20, "experience": 0.20, "presence": 0.15, "soft": 0.35},
    "classic_tech": {"academic": 0.15, "technical": 0.30, "experience": 0.30, "presence": 0.15, "soft": 0.10},
}

RESEARCH_WEIGHT_OVERRIDE: Dict[str, float] = {
    "academic": 0.20, "technical": 0.30, "experience": 0.30, "presence": 0.10, "soft": 0.10
}

NUMERIC_TOLERANCE: float = 1e-6

# Dataset-level balance quality gate (Issue 9).
MAX_CATEGORY_SHARE: float = 0.55
MIN_ROLE_SHARE: float = 0.005


# =============================================================================
# LATENT-TRAIT ENGINE
# =============================================================================

def _build_latent_covariance() -> np.ndarray:
    """Builds the covariance matrix for the correlated latent-trait draw."""
    k = len(LATENT_FACTORS)
    cov = np.full((k, k), LATENT_CORRELATION)
    np.fill_diagonal(cov, 1.0)
    return cov


_LATENT_COV: np.ndarray = _build_latent_covariance()


def sample_latent_traits(rng: np.random.Generator) -> Dict[str, float]:
    """Draws a correlated latent-trait vector for one synthetic student."""
    draw = rng.multivariate_normal(mean=np.zeros(len(LATENT_FACTORS)), cov=_LATENT_COV)
    return dict(zip(LATENT_FACTORS, draw))


def sample_from_latent(
    rng: np.random.Generator,
    latent: Dict[str, float],
    loadings: Dict[str, float],
    base: float,
    scale: float,
    noise_std: float,
    min_val: float,
    max_val: float,
) -> float:
    """Generic latent-trait -> observed-feature transform with bounded noise."""
    linear = sum(loadings.get(factor, 0.0) * latent[factor] for factor in loadings)
    value = base + scale * linear + rng.normal(0.0, noise_std)
    return float(np.clip(value, min_val, max_val))


# =============================================================================
# IDENTITY / CONTEXT ASSIGNMENT FUNCTIONS (Layer 0)
# =============================================================================

def assign_degree(rng: np.random.Generator) -> str:
    return str(rng.choice(DEGREES, p=DEGREE_WEIGHTS))


def assign_branch(rng: np.random.Generator, degree: str) -> str:
    """Branch assignment loosely conditioned on degree for realism."""
    if degree in ("MCA", "BCA"):
        pool = CORE_TECH_BRANCHES
        weights = np.ones(len(pool))
        weights[:2] = 2.0  # first two entries favored, independent of list length
        return str(rng.choice(pool, p=weights / weights.sum()))
    weights = np.array([2.0 if b in CORE_TECH_BRANCHES else 1.0 for b in BRANCHES])
    weights = weights / weights.sum()
    return str(rng.choice(BRANCHES, p=weights))


def assign_specialization(rng: np.random.Generator, latent: Dict[str, float]) -> str:
    """Specialization track sampled with a mild bias toward domain strength."""
    weights = np.ones(len(SPECIALIZATION_TRACKS))
    if latent["domain_specialization_strength"] > 0.5:
        weights[SPECIALIZATION_TRACKS.index("Applied Research")] *= 1.5
        weights[SPECIALIZATION_TRACKS.index("Generative AI")] *= 1.3
    weights = weights / weights.sum()
    return str(rng.choice(SPECIALIZATION_TRACKS, p=weights))


def assign_target_role(rng: np.random.Generator, branch: str, specialization: str) -> RoleConfig:
    """Probabilistic role assignment: category first, then role within category,
    with a branch/specialization affinity multiplier (never a deterministic map)."""
    categories = list(CATEGORY_SELECTION_WEIGHTS.keys())
    category_probs = np.array([CATEGORY_SELECTION_WEIGHTS[c] for c in categories])
    category = str(rng.choice(categories, p=category_probs / category_probs.sum()))

    candidates = [r for r in ROLE_CATALOG if r.category == category]
    weights = []
    for role in candidates:
        w = 1.0
        if branch in role.primary_branches:
            w *= 6.0  # strong enough that alignment dominates for narrow-branch roles
        if specialization == role.specialization_affinity:
            w *= 1.6
        weights.append(w)
    weights_arr = np.array(weights)
    weights_arr = weights_arr / weights_arr.sum()
    idx = rng.choice(len(candidates), p=weights_arr)
    return candidates[idx]


def _sector_distribution(role: RoleConfig) -> Tuple[List[str], np.ndarray]:
    """Builds a non-deterministic sector probability distribution for a role."""
    weights = []
    for sector in SECTORS:
        if sector == role.primary_sector:
            weights.append(0.50)
        elif sector == role.secondary_sector:
            weights.append(0.25)
        else:
            weights.append(0.25 / (len(SECTORS) - 2))
    weights_arr = np.array(weights)
    return SECTORS, weights_arr / weights_arr.sum()


def assign_sector(rng: np.random.Generator, role: RoleConfig) -> str:
    sectors, probs = _sector_distribution(role)
    return str(rng.choice(sectors, p=probs))


def assign_goal(rng: np.random.Generator, degree: str, role: RoleConfig) -> str:
    weights = np.ones(len(GOALS))
    if degree == "PhD":
        weights[GOALS.index("Higher Studies/Research")] *= 4.0
    elif degree == "MSc" and role.research_oriented:
        weights[GOALS.index("Higher Studies/Research")] *= 2.5
    if role.category == "emerging_ai_adjacent":
        weights[GOALS.index("Entrepreneurship/Startup")] *= 1.5
        weights[GOALS.index("Freelance/Remote Work")] *= 1.3
    weights = weights / weights.sum()
    return str(rng.choice(GOALS, p=weights))


# =============================================================================
# LAYER 1 -- RAW BEHAVIORAL FEATURES
# =============================================================================

def generate_behavioral_features(rng: np.random.Generator, latent: Dict[str, float]) -> Dict[str, float]:
    cgpa = sample_from_latent(
        rng, latent, {"academic_aptitude": 0.7, "discipline": 0.3}, base=7.0, scale=1.0,
        noise_std=0.4, min_val=4.0, max_val=10.0,
    )
    attendance = sample_from_latent(
        rng, latent, {"discipline": 0.8, "ambition": 0.2}, base=78.0, scale=10.0,
        noise_std=6.0, min_val=40.0, max_val=100.0,
    )

    aptitude_discipline = latent["academic_aptitude"] + latent["discipline"]
    backlog_lambda = max(0.05, 1.0 - 0.6 * aptitude_discipline)
    backlogs = int(np.clip(rng.poisson(backlog_lambda), 0, 8))

    study_hours = sample_from_latent(
        rng, latent, {"discipline": 0.6, "ambition": 0.4}, base=4.0, scale=1.5,
        noise_std=1.0, min_val=0.0, max_val=12.0,
    )
    self_learning_hours = sample_from_latent(
        rng, latent, {"ambition": 0.7, "technical_depth": 0.3}, base=2.5, scale=1.5,
        noise_std=1.0, min_val=0.0, max_val=10.0,
    )
    sleep_hours = sample_from_latent(
        rng, latent, {"discipline": 0.3}, base=6.5, scale=0.6,
        noise_std=0.8, min_val=3.0, max_val=9.0,
    )
    screen_time = sample_from_latent(
        rng, latent, {"discipline": -0.3}, base=5.0, scale=1.0,
        noise_std=1.2, min_val=1.0, max_val=12.0,
    )
    assignment_score = sample_from_latent(
    rng,
    latent,
    {
        "academic_aptitude": 0.55,
        "discipline": 0.45
    },
    base=72.0,
    scale=10.0,
    noise_std=5.0,
    min_val=30.0,
    max_val=100.0,
)
    internal_marks = sample_from_latent(
        rng, latent, {"academic_aptitude": 0.6, "discipline": 0.4}, base=70.0, scale=10.0,
        noise_std=6.0, min_val=30.0, max_val=100.0,
    )

    return {
        "cgpa": round(cgpa, 2),
        "attendance": round(attendance, 1),
        "backlogs": backlogs,
        "study_hours": round(study_hours, 1),
        "self_learning_hours": round(self_learning_hours, 1),
        "sleep_hours": round(sleep_hours, 1),
        "screen_time": round(screen_time, 1),
        "assignment_score": round(assignment_score, 1),
        "internal_marks": round(internal_marks, 1),
    }


# =============================================================================
# LAYER 2 -- RAW SKILL / TEST FEATURES
# =============================================================================

def generate_skill_features(rng: np.random.Generator, latent: Dict[str, float]) -> Dict[str, float]:
    programming_score = sample_from_latent(
        rng, latent, {"technical_depth": 0.8, "ambition": 0.2}, base=60.0, scale=15.0,
        noise_std=8.0, min_val=0.0, max_val=100.0,
    )
    dsa_score = sample_from_latent(
        rng, latent, {"technical_depth": 0.7, "academic_aptitude": 0.3}, base=55.0, scale=15.0,
        noise_std=9.0, min_val=0.0, max_val=100.0,
    )
    sql_score = sample_from_latent(
        rng, latent, {"technical_depth": 0.6, "discipline": 0.2}, base=58.0, scale=12.0,
        noise_std=8.0, min_val=0.0, max_val=100.0,
    )
    math_foundation_score = sample_from_latent(
        rng, latent, {"academic_aptitude": 0.7, "domain_specialization_strength": 0.3}, base=55.0, scale=15.0,
        noise_std=8.0, min_val=0.0, max_val=100.0,
    )
    ai_tool_fluency_score = sample_from_latent(
        rng, latent, {"ambition": 0.5, "technical_depth": 0.4, "domain_specialization_strength": 0.3},
        base=50.0, scale=15.0, noise_std=9.0, min_val=0.0, max_val=100.0,
    )
    aptitude_score = sample_from_latent(
        rng, latent, {"academic_aptitude": 0.6, "technical_depth": 0.2}, base=60.0, scale=12.0,
        noise_std=8.0, min_val=0.0, max_val=100.0,
    )
    communication_score = sample_from_latent(
        rng, latent, {"communication_polish": 0.9}, base=60.0, scale=15.0,
        noise_std=8.0, min_val=0.0, max_val=100.0,
    )
    english_proficiency_score = sample_from_latent(
        rng, latent, {"communication_polish": 0.7, "academic_aptitude": 0.2}, base=65.0, scale=12.0,
        noise_std=7.0, min_val=0.0, max_val=100.0,
    )

    return {
        "programming_score": round(programming_score, 1),
        "dsa_score": round(dsa_score, 1),
        "sql_score": round(sql_score, 1),
        "math_foundation_score": round(math_foundation_score, 1),
        "ai_tool_fluency_score": round(ai_tool_fluency_score, 1),
        "aptitude_score": round(aptitude_score, 1),
        "communication_score": round(communication_score, 1),
        "english_proficiency_score": round(english_proficiency_score, 1),
    }


# =============================================================================
# LAYER 3 -- EXPERIENCE / PRESENCE FEATURES
# =============================================================================

def generate_experience_features(
    rng: np.random.Generator, latent: Dict[str, float], role: RoleConfig
) -> Dict[str, float]:
    projects_count = int(round(sample_from_latent(
        rng, latent, {"ambition": 0.6, "technical_depth": 0.4}, base=3.0, scale=2.0,
        noise_std=1.2, min_val=0.0, max_val=15.0,
    )))
    hackathons_count = int(round(sample_from_latent(
        rng, latent, {"ambition": 0.7}, base=1.0, scale=1.5,
        noise_std=1.0, min_val=0.0, max_val=10.0,
    )))
    certifications_count = int(round(sample_from_latent(
        rng, latent, {"ambition": 0.4, "discipline": 0.3}, base=2.0, scale=1.5,
        noise_std=1.0, min_val=0.0, max_val=12.0,
    )))
    internships_count = int(round(sample_from_latent(
        rng, latent, {"ambition": 0.5, "technical_depth": 0.2}, base=1.0, scale=1.0,
        noise_std=0.8, min_val=0.0, max_val=5.0,
    )))
    open_source_contributions = int(round(sample_from_latent(
        rng, latent, {"technical_depth": 0.6, "ambition": 0.3}, base=1.0, scale=2.0,
        noise_std=1.5, min_val=0.0, max_val=50.0,
    )))

    research_multiplier = 3.0 if role.research_oriented else 1.0
    research_publications_count = int(round(sample_from_latent(
        rng, latent, {"domain_specialization_strength": 0.6, "academic_aptitude": 0.3},
        base=0.2 * research_multiplier, scale=1.0 * research_multiplier,
        noise_std=0.5, min_val=0.0, max_val=10.0,
    )))

    cloud_deployment_score = sample_from_latent(
        rng, latent, {"technical_depth": 0.5, "ambition": 0.3}, base=45.0, scale=15.0,
        noise_std=10.0, min_val=0.0, max_val=100.0,
    )
    github_activity_score = sample_from_latent(
        rng, latent, {"technical_depth": 0.6, "ambition": 0.3}, base=50.0, scale=15.0,
        noise_std=9.0, min_val=0.0, max_val=100.0,
    )
    linkedin_activity_score = sample_from_latent(
        rng, latent, {"ambition": 0.5, "communication_polish": 0.3}, base=45.0, scale=12.0,
        noise_std=9.0, min_val=0.0, max_val=100.0,
    )
    portfolio_website_score = sample_from_latent(
        rng, latent, {"ambition": 0.4, "technical_depth": 0.3, "communication_polish": 0.3},
        base=35.0, scale=15.0, noise_std=10.0, min_val=0.0, max_val=100.0,
    )
    interview_practice_score = sample_from_latent(
        rng, latent, {"discipline": 0.4, "ambition": 0.4, "technical_depth": 0.2}, base=45.0, scale=15.0,
        noise_std=9.0, min_val=0.0, max_val=100.0,
    )

    return {
        "projects_count": projects_count,
        "hackathons_count": hackathons_count,
        "certifications_count": certifications_count,
        "internships_count": internships_count,
        "open_source_contributions": open_source_contributions,
        "research_publications_count": research_publications_count,
        "cloud_deployment_score": round(cloud_deployment_score, 1),
        "github_activity_score": round(github_activity_score, 1),
        "linkedin_activity_score": round(linkedin_activity_score, 1),
        "portfolio_website_score": round(portfolio_website_score, 1),
        "interview_practice_score": round(interview_practice_score, 1),
    }


# =============================================================================
# LAYER 4 -- MID-LEVEL DERIVED FEATURES
# (generated strictly from Layer 1-3; never from Layer 5)
# =============================================================================

def calculate_resume_score(
    rng: np.random.Generator, skill: Dict[str, float], experience: Dict[str, float]
) -> float:
    technical_component = np.mean([
        skill["programming_score"], skill["dsa_score"], skill["sql_score"], skill["ai_tool_fluency_score"],
    ])
    experience_component = np.mean([
        min(experience["projects_count"] / 15.0 * 100.0, 100.0),
        min(experience["internships_count"] / 5.0 * 100.0, 100.0),
        min(experience["certifications_count"] / 12.0 * 100.0, 100.0),
    ])
    presence_component = np.mean([
        experience["github_activity_score"], experience["linkedin_activity_score"],
        experience["portfolio_website_score"],
    ])
    raw = 0.35 * technical_component + 0.40 * experience_component + 0.25 * presence_component
    raw += rng.normal(0.0, 4.0)
    return float(np.clip(raw, 0.0, 100.0))


def calculate_ats_score(rng: np.random.Generator, resume_score: float, skill: Dict[str, float]) -> float:
    keyword_match_proxy = np.mean([skill["programming_score"], skill["dsa_score"], skill["sql_score"]])
    formatting_noise = rng.normal(0.0, 12.0)  # parseability has its own independent variance
    raw = 0.35 * resume_score + 0.65 * keyword_match_proxy + formatting_noise
    return float(np.clip(raw, 0.0, 100.0))


def calculate_academic_score(rng: np.random.Generator, behavioral: Dict[str, float]) -> float:
    cgpa_component = (behavioral["cgpa"] / 10.0) * 100.0
    backlog_penalty = min(behavioral["backlogs"], 5) * 2.5  # cap the penalty's influence
    raw = (
        0.45 * cgpa_component
        + 0.25 * behavioral["attendance"]
        + 0.30 * behavioral["internal_marks"]
        - backlog_penalty
    )
    raw += rng.normal(0.0, 5.0)  # higher independent noise decouples the pair
    return float(np.clip(raw, 0.0, 100.0))


def calculate_academic_category(df: pd.DataFrame, seed: int) -> pd.Series:
    """Percentile-based banding computed within each degree group, with
    boundary smoothing noise to avoid hard-cliff artifacts."""
    rng = np.random.default_rng(seed + 1)
    categories = pd.Series(index=df.index, dtype="object")

    for degree, group in df.groupby("degree"):
        scores = group["academic_score"] + rng.normal(0.0, 1.5, size=len(group))
        ranks = scores.rank(pct=True)
        band = pd.cut(
            ranks,
            bins=[0.0, 0.15, 0.50, 0.85, 1.0],
            labels=["At-Risk", "Average", "Good", "Excellent"],
            include_lowest=True,
        )
        categories.loc[group.index] = band.astype(str)

    return categories


# =============================================================================
# LAYER 5 -- OUTCOME FEATURES
# =============================================================================

def _employability_weight_profile(role: RoleConfig) -> Dict[str, float]:
    if role.research_oriented:
        return RESEARCH_WEIGHT_OVERRIDE
    return CATEGORY_WEIGHT_PROFILES[role.category]


def calculate_employability_score(
    rng: np.random.Generator,
    role: RoleConfig,
    academic_score: float,
    skill: Dict[str, float],
    experience: Dict[str, float],
    resume_score: float,
    ats_score: float,
    backlogs: int,
) -> float:
    weights = _employability_weight_profile(role)

    technical_component = np.mean([
        skill["programming_score"], skill["dsa_score"], skill["sql_score"],
        skill["math_foundation_score"], skill["ai_tool_fluency_score"],
    ])
    experience_terms = [
        min(experience["projects_count"] / 15.0 * 100.0, 100.0),
        min(experience["internships_count"] / 5.0 * 100.0, 100.0),
        min(experience["hackathons_count"] / 10.0 * 100.0, 100.0),
        min(experience["open_source_contributions"] / 50.0 * 100.0, 100.0),
        experience["cloud_deployment_score"],
    ]
    if role.research_oriented:
        experience_terms.append(
            min(experience["research_publications_count"] / 10.0 * 100.0, 100.0)
        )
    experience_component = float(np.mean(experience_terms))
    presence_component = np.mean([
        experience["github_activity_score"], experience["linkedin_activity_score"],
        experience["portfolio_website_score"],
    ])
    soft_component = np.mean([
        skill["communication_score"], skill["aptitude_score"],
        skill["english_proficiency_score"], experience["interview_practice_score"],
    ])
    presentation_component = np.mean([resume_score, ats_score])

    raw = (
        weights["academic"] * academic_score
        + weights["technical"] * technical_component
        + weights["experience"] * experience_component
        + weights["presence"] * presence_component
        + weights["soft"] * soft_component
    )
    # Small presentation-quality nudge, capped so it can never dominate the score.
    raw = 0.92 * raw + 0.08 * presentation_component

    if backlogs > 2:
        raw -= (backlogs - 2) * 3.0

    raw -= role.difficulty * 2.0
    raw += rng.normal(0.0, 4.0)
    return float(np.clip(raw, 0.0, 100.0))


_MEAN_DEMAND: float = float(np.mean([r.demand_index for r in ROLE_CATALOG]))
_MEAN_SECTOR_GROWTH: float = float(np.mean(list(SECTOR_GROWTH_WEIGHT.values())))


def calculate_placement_probability(
    rng: np.random.Generator, employability_score: float, role: RoleConfig, sector: str
) -> float:
    sector_growth_weight = SECTOR_GROWTH_WEIGHT[sector]
    z = (
        0.09 * (employability_score - 50.0)
        + 4.0 * (role.demand_index - _MEAN_DEMAND)
        + 3.0 * (sector_growth_weight - _MEAN_SECTOR_GROWTH)
        + rng.normal(0.0, 0.6)
    )
    probability = 1.0 / (1.0 + np.exp(-z))
    return float(np.clip(probability, 0.03, 0.97))


# =============================================================================
# STUDENT-LEVEL ORCHESTRATION
# =============================================================================

def generate_student(rng: np.random.Generator, student_id: int) -> Dict:
    """Generates one fully-populated student record following the causal DAG."""
    latent = sample_latent_traits(rng)

    degree = assign_degree(rng)
    branch = assign_branch(rng, degree)
    specialization = assign_specialization(rng, latent)
    role = assign_target_role(rng, branch, specialization)
    sector = assign_sector(rng, role)
    goal = assign_goal(rng, degree, role)
    year = int(rng.integers(1, 5)) if degree != "PhD" else int(rng.integers(1, 6))

    behavioral = generate_behavioral_features(rng, latent)
    skill = generate_skill_features(rng, latent)
    experience = generate_experience_features(rng, latent, role)

    resume_score = calculate_resume_score(rng, skill, experience)
    ats_score = calculate_ats_score(rng, resume_score, skill)
    academic_score = calculate_academic_score(rng, behavioral)

    employability_score = calculate_employability_score(
        rng, role, academic_score, skill, experience, resume_score, ats_score, behavioral["backlogs"],
    )
    placement_probability = calculate_placement_probability(rng, employability_score, role, sector)

    record: Dict = {
        "student_id": student_id,
        "degree": degree,
        "branch": branch,
        "year": year,
        "specialization_track": specialization,
        "target_role": role.name,
        "sector": sector,
        "goal": goal,
    }
    record.update(behavioral)
    record.update(skill)
    record.update(experience)
    record["resume_score"] = round(resume_score, 1)
    record["ats_score"] = round(ats_score, 1)
    record["academic_score"] = round(academic_score, 1)
    record["employability_score"] = round(employability_score, 1)
    record["placement_probability"] = round(placement_probability, 4)

    validate_student(record)
    return record


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate_student(record: Dict) -> None:
    """Row-level sanity checks. Raises ValueError on construction bugs;
    values themselves are already bounded via clipping upstream. Uses real
    exceptions (not bare `assert`) so checks survive -O / PYTHONOPTIMIZE."""
    _require(4.0 <= record["cgpa"] <= 10.0, "cgpa out of bounds")
    _require(0.0 <= record["attendance"] <= 100.0, "attendance out of bounds")
    _require(record["backlogs"] >= 0, "negative backlogs")
    for count_field in (
        "projects_count", "hackathons_count", "certifications_count", "internships_count",
        "open_source_contributions", "research_publications_count",
    ):
        _require(record[count_field] >= 0, f"{count_field} negative")
    for score_field in (
        "programming_score", "dsa_score", "sql_score", "assignment_score", "math_foundation_score",
        "ai_tool_fluency_score", "aptitude_score", "communication_score",
        "english_proficiency_score", "cloud_deployment_score", "github_activity_score",
        "linkedin_activity_score", "portfolio_website_score", "interview_practice_score",
        "resume_score", "ats_score", "academic_score", "employability_score",
    ):
        _require(0.0 <= record[score_field] <= 100.0, f"{score_field} out of bounds")
    _require(0.0 < record["placement_probability"] < 1.0, "placement_probability at an absolute extreme")


# =============================================================================
# DATASET-LEVEL PIPELINE
# =============================================================================

def generate_dataset(n_rows: int = DEFAULT_ROW_COUNT, seed: int = DEFAULT_SEED) -> pd.DataFrame:
    """Generates the full dataset, enforcing uniqueness and running the
    dataset-level validation/derivation passes."""
    rng = np.random.default_rng(seed)
    records: List[Dict] = []

    # Generate a small overshoot buffer up front instead of a one-at-a-time
    # backfill loop -- with ~30 continuous, independently-noised features per
    # row, exact duplicates are astronomically unlikely, so this buffer is
    # a scalability safeguard rather than an expected code path.
    overshoot_rows = max(n_rows + 5, int(n_rows * 1.001) + 1)

    next_id = 1
    while len(records) < overshoot_rows:
        record = generate_student(rng, next_id)
        records.append(record)
        next_id += 1

    df = pd.DataFrame(records)
    df = _remove_duplicates(df, n_rows)
    df["academic_category"] = calculate_academic_category(df, seed)

    column_order = [
        "student_id", "degree", "branch", "year", "specialization_track", "target_role", "sector", "goal",
        "cgpa", "attendance", "backlogs", "study_hours", "self_learning_hours", "sleep_hours",
        "screen_time", "assignment_score", "internal_marks",
        "programming_score", "dsa_score", "sql_score", "math_foundation_score", "ai_tool_fluency_score",
        "aptitude_score", "communication_score", "english_proficiency_score",
        "projects_count", "hackathons_count", "certifications_count", "internships_count",
        "open_source_contributions", "research_publications_count", "cloud_deployment_score",
        "github_activity_score", "linkedin_activity_score", "portfolio_website_score",
        "interview_practice_score",
        "resume_score", "ats_score", "academic_score", "academic_category",
        "employability_score", "placement_probability",
    ]
    df = df[column_order]
    return df


def _remove_duplicates(df: pd.DataFrame, target_rows: int) -> pd.DataFrame:
    """Removes fully-duplicate feature rows (excluding student_id) and
    truncates the (overshot) frame down to the target row count. Vectorized
    -- no per-row backfill loop -- so this scales to the 100k-500k range."""
    feature_cols = [c for c in df.columns if c != "student_id"]
    df = df.drop_duplicates(subset=feature_cols).reset_index(drop=True)

    if len(df) < target_rows:
        raise ValueError(
            f"Deduplication dropped below target row count ({len(df)} < {target_rows}); "
            "increase the overshoot buffer in generate_dataset()."
        )

    df = df.iloc[:target_rows].reset_index(drop=True)
    df["student_id"] = range(1, len(df) + 1)
    return df


def validate_dataset(df: pd.DataFrame) -> Dict[str, object]:
    """Dataset-level validation pipeline producing a structured report."""
    report: Dict[str, object] = {}

    report["row_count"] = len(df)
    report["null_count"] = int(df.isnull().sum().sum())
    report["duplicate_feature_rows"] = int(
        df.drop(columns=["student_id"]).duplicated().sum()
    )
    report["duplicate_student_ids"] = int(df["student_id"].duplicated().sum())

    bound_violations = 0
    bound_violations += int((~df["cgpa"].between(4.0, 10.0)).sum())
    bound_violations += int((~df["attendance"].between(0.0, 100.0)).sum())
    bound_violations += int((df["backlogs"] < 0).sum())
    for col in (
        "programming_score", "dsa_score", "sql_score", "math_foundation_score",
        "ai_tool_fluency_score", "aptitude_score", "communication_score",
        "english_proficiency_score", "cloud_deployment_score", "github_activity_score",
        "linkedin_activity_score", "portfolio_website_score", "interview_practice_score",
        "resume_score", "ats_score", "academic_score", "employability_score",
    ):
        bound_violations += int((~df[col].between(0.0, 100.0)).sum())
    bound_violations += int((~df["placement_probability"].between(NUMERIC_TOLERANCE, 1.0 - NUMERIC_TOLERANCE)).sum())

    report["bound_violations"] = bound_violations
    report["category_distribution"] = df["academic_category"].value_counts(normalize=True).round(3).to_dict()
    report["role_distribution"] = df["target_role"].value_counts(normalize=True).round(3).to_dict()
    report["sector_distribution"] = df["sector"].value_counts(normalize=True).round(3).to_dict()

    balance_ok = (
        max(report["category_distribution"].values()) <= MAX_CATEGORY_SHARE
        and min(report["role_distribution"].values()) >= MIN_ROLE_SHARE
    )
    report["balance_ok"] = balance_ok

    report["is_valid"] = (
        report["null_count"] == 0
        and report["duplicate_feature_rows"] == 0
        and report["duplicate_student_ids"] == 0
        and report["bound_violations"] == 0
        and balance_ok
    )
    return report


def export_dataset(df: pd.DataFrame, path: str = OUTPUT_PATH) -> None:
    df.to_csv(path, index=False)


def print_summary(df: pd.DataFrame, report: Dict[str, object]) -> None:
    logger.info("=" * 70)
    logger.info("DATASET V6 GENERATION SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Rows generated           : {report['row_count']}")
    logger.info(f"Columns                  : {len(df.columns)}")
    logger.info(f"Null values              : {report['null_count']}")
    logger.info(f"Duplicate feature rows   : {report['duplicate_feature_rows']}")
    logger.info(f"Duplicate student_ids    : {report['duplicate_student_ids']}")
    logger.info(f"Bound violations         : {report['bound_violations']}")
    logger.info(f"Balance ok               : {report['balance_ok']}")
    logger.info(f"Dataset valid            : {report['is_valid']}")
    logger.info("-" * 70)
    logger.info("Academic category distribution:")
    for category, proportion in report["category_distribution"].items():
        logger.info(f"  {category:<12}: {proportion:.1%}")
    logger.info("-" * 70)
    logger.info("Top 5 target roles:")
    top_roles = sorted(report["role_distribution"].items(), key=lambda kv: kv[1], reverse=True)[:5]
    for role, proportion in top_roles:
        logger.info(f"  {role:<32}: {proportion:.1%}")
    logger.info("-" * 70)
    logger.info("Sector distribution:")
    for sector, proportion in sorted(report["sector_distribution"].items(), key=lambda kv: kv[1], reverse=True):
        logger.info(f"  {sector:<28}: {proportion:.1%}")
    logger.info("=" * 70)


# =============================================================================
# ENTRY POINT
# =============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the AI Career Success Advisor dataset v6.")
    parser.add_argument("--rows", type=int, default=DEFAULT_ROW_COUNT, help="Number of student rows to generate.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed for reproducibility.")
    parser.add_argument("--output", type=str, default=OUTPUT_PATH, help="Output CSV path.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    df = generate_dataset(n_rows=args.rows, seed=args.seed)
    report = validate_dataset(df)

    if not report["is_valid"]:
        logger.error("VALIDATION FAILED -- dataset was not exported.")
        logger.error(report)
        return 1

    export_dataset(df, args.output)
    print_summary(df, report)
    logger.info(f"Dataset exported to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
