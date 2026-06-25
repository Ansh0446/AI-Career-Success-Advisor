# User Input
# ↓
# Load Models
# ↓
# Load Encoders
# ↓
# Encode Input
# ↓
# Academic Prediction
# ↓
# Employability Prediction
# ↓
# Print Output

# predict.py

import joblib
import pandas as pd

# =========================================
# Load Models
# =========================================

academic_model = joblib.load("models/academic_model.pkl")
employability_model = joblib.load("models/employability_model.pkl")

# =========================================
# Load Encoders
# =========================================

le_degree = joblib.load("models/le_degree.pkl")
le_branch = joblib.load("models/le_branch.pkl")
le_goal = joblib.load("models/le_goal.pkl")
le_role = joblib.load("models/le_role.pkl")
le_sector = joblib.load("models/le_sector.pkl")
le_academic = joblib.load("models/le_academic.pkl")

# =========================================
# User Input
# =========================================

student = {
    "degree": "B.Tech",
    "branch": "AI&DS",
    "year": 2,
    "cgpa": 8.4,
    "attendance": 65,
    "study_hours": 5,
    "self_learning_hours": 3,
    "sleep_hours": 7,
    "screen_time": 5,
    "assignment_score": 82,
    "internal_marks": 80,
    "backlogs": 0,
    "projects_count": 3,
    "hackathons_count": 2,
    "certifications_count": 4,
    "github_activity_score": 70,
    "linkedin_activity_score": 50,
    "programming_score": 80,
    "sql_score": 75,
    "dsa_score": 70,
    "communication_score": 75,
    "aptitude_score": 72,
    "internships_count": 1,
    "resume_score": 80,
    "ats_score": 78,
    "goal": "Placement",
    "target_role": "ML Engineer",
    "sector": "Tech"
}

# =========================================
# Encode Categorical Features
# =========================================

student["degree"] = le_degree.transform([student["degree"]])[0]
student["branch"] = le_branch.transform([student["branch"]])[0]
student["goal"] = le_goal.transform([student["goal"]])[0]
student["target_role"] = le_role.transform([student["target_role"]])[0]
student["sector"] = le_sector.transform([student["sector"]])[0]

# =========================================
# Create DataFrame
# =========================================

input_df = pd.DataFrame([student])

# =========================================
# Academic Prediction
# =========================================

academic_input = input_df.copy()

academic_prediction = academic_model.predict(
    academic_input
)

academic_category = le_academic.inverse_transform(
    academic_prediction
)[0]

# =========================================
# Create Employability Input
# =========================================

academic_score = (
    student["cgpa"] * 7
    + student["study_hours"] * 3
    + student["self_learning_hours"] * 2
    + student["projects_count"] * 2
    + student["attendance"] * 0.05
    - student["backlogs"] * 8
    - student["screen_time"]
)

employability_input = input_df.copy()

# sector remove
employability_input.drop(
    columns=["sector"],
    inplace=True
)

# add academic columns
employability_input["academic_score"] = academic_score

employability_input["academic_category"] = academic_prediction[0]

# =========================================
# Employability Prediction
# =========================================

employability_prediction = employability_model.predict(
    employability_input
)

employability_score = employability_prediction[0]

# =========================================
# Placement Probability
# =========================================

placement_probability = min(
    employability_score * 0.9,
    100
)

# =========================================
# Strengths and Weaknesses
# =========================================

strengths = []
weaknesses = []

if student["projects_count"] >= 3:
    strengths.append("Projects")
else:
    weaknesses.append("Projects")

if student["programming_score"] >= 70:
    strengths.append("Programming")
else:
    weaknesses.append("Programming")

if student["communication_score"] >= 70:
    strengths.append("Communication")
else:
    weaknesses.append("Communication")

if student["resume_score"] >= 75:
    strengths.append("Resume")
else:
    weaknesses.append("Resume")

if student["dsa_score"] >= 65:
    strengths.append("DSA")
else:
    weaknesses.append("DSA")

# =========================================
# Recommendations
# =========================================

recommendations = []

if "Projects" in weaknesses:
    recommendations.append(
        "Build 2-3 good projects."
    )

if "Programming" in weaknesses:
    recommendations.append(
        "Practice Python and problem solving."
    )

if "Communication" in weaknesses:
    recommendations.append(
        "Improve communication and presentation skills."
    )

if "Resume" in weaknesses:
    recommendations.append(
        "Improve ATS score and resume formatting."
    )

if "DSA" in weaknesses:
    recommendations.append(
        "Solve DSA problems regularly."
    )

# =========================================
# Final Output
# =========================================

print("\n========== RESULT ==========\n")

print(
    "Academic Category :",
    academic_category
)

print(
    "Employability Score :",
    round(employability_score, 2)
)

print(
    "Placement Probability :",
    round(placement_probability, 2),
    "%"
)

print("\nStrengths :")
for i in strengths:
    print("-", i)

print("\nWeaknesses :")
for i in weaknesses:
    print("-", i)

print("\nRecommendations :")
for i in recommendations:
    print("-", i)