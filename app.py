from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
from mentor import generate_roadmap as ai_generate_roadmap
from resume_analyzer import analyze_resume
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
# ==========================================================
# LOAD MODELS
# ==========================================================

academic_model = joblib.load("models/academic_model.pkl")
employability_model = joblib.load("models/employability_model.pkl")

# ==========================================================
# LOAD LABEL ENCODERS
# ==========================================================

le_degree = joblib.load("models/le_degree.pkl")
le_branch = joblib.load("models/le_branch.pkl")
le_goal = joblib.load("models/le_goal.pkl")
le_role = joblib.load("models/le_role.pkl")
le_sector = joblib.load("models/le_sector.pkl")
le_academic = joblib.load("models/le_academic.pkl")

# ==========================================================
# YEAR MAPPING
# ==========================================================

YEAR_MAP = {
    "1st Year": 1,
    "2nd Year": 2,
    "3rd Year": 3,
    "4th Year": 4,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4
}

# ==========================================================
# HOME PAGE
# ==========================================================

@app.route("/") 
def home():
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

# ==========================================================
# PREDICTION ROUTE
# ==========================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        data = request.get_json()

        student = {

            "degree": le_degree.transform(
                [data["degree"]]
            )[0],

            "branch": le_branch.transform(
                [data["branch"]]
            )[0],

            "year": YEAR_MAP.get(
                str(data["year"]),
                1
            ),

            "cgpa": float(data["cgpa"]),

            "attendance": int(
                float(data["attendance"])
            ),

            "study_hours": float(
                data["study_hours"]
            ),

            "self_learning_hours": float(
                data["self_learning_hours"]
            ),

            "sleep_hours": float(
                data["sleep_hours"]
            ),

            "screen_time": float(
                data["screen_time"]
            ),

            "assignment_score": int(
                float(data["assignment_score"])
            ),

            "internal_marks": int(
                float(data["internal_marks"])
            ),

            "backlogs": int(
                float(data["backlogs"])
            ),

            "projects_count": int(
                float(data["projects_count"])
            ),

            "hackathons_count": int(
                float(data["hackathons_count"])
            ),

            "certifications_count": int(
                float(data["certifications_count"])
            ),

            "github_activity_score": int(
                float(data["github_activity_score"])
            ),

            "linkedin_activity_score": int(
                float(data["linkedin_activity_score"])
            ),

            "programming_score": int(
                float(data["programming_score"])
            ),

            "sql_score": int(
                float(data["sql_score"])
            ),

            "dsa_score": int(
                float(data["dsa_score"])
            ),

            "communication_score": int(
                float(data["communication_score"])
            ),

            "aptitude_score": int(
                float(data["aptitude_score"])
            ),

            "internships_count": int(
                float(data["internships_count"])
            ),

            "resume_score": int(
                float(data["resume_score"])
            ),

            "ats_score": int(
                float(data["ats_score"])
            ),

            "goal": le_goal.transform(
                [data["goal"]]
            )[0],

            "target_role": le_role.transform(
                [data["target_role"]]
            )[0],

            "sector": le_sector.transform(
                [data["sector"]]
            )[0]

        }

        academic_input = pd.DataFrame([student])

        academic_prediction = academic_model.predict(
            academic_input
        )[0]

        academic_category = le_academic.inverse_transform(
            [academic_prediction]
        )[0]
    
        # ==========================================================
        # CALCULATE ACADEMIC SCORE
        # ==========================================================

        academic_score = (

            student["cgpa"] * 7 +

            student["study_hours"] * 3 +

            student["self_learning_hours"] * 2 +

            student["projects_count"] * 2 +

            student["attendance"] * 0.05 -

            student["backlogs"] * 8 -

            student["screen_time"]

        )

        # ==========================================================
        # EMPLOYABILITY MODEL INPUT
        # ==========================================================

        employability_input = academic_input.copy()

        employability_input["academic_score"] = academic_score

        employability_input["academic_category"] = academic_prediction

        employability_input = employability_input.drop(
            columns=["sector"]
        )

        # ==========================================================
        # EMPLOYABILITY PREDICTION
        # ==========================================================

        employability_score = float(

            employability_model.predict(
                employability_input
            )[0]

        )

        placement_probability = round(

            min(

                employability_score * 0.90,

                100

            ),

            2

        )

        # ==========================================================
        # STRENGTHS
        # ==========================================================

        strengths = []

        if student["projects_count"] >= 3:
            strengths.append("Projects")

        if student["programming_score"] >= 70:
            strengths.append("Programming")

        if student["communication_score"] >= 70:
            strengths.append("Communication")

        if student["resume_score"] >= 70:
            strengths.append("Resume")

        if student["dsa_score"] >= 70:
            strengths.append("DSA")

        if student["github_activity_score"] >= 70:
            strengths.append("GitHub")

        if student["linkedin_activity_score"] >= 70:
            strengths.append("LinkedIn")

        if student["cgpa"] >= 8:
            strengths.append("Academic Performance")

        # ==========================================================
        # WEAKNESSES
        # ==========================================================

        weaknesses = []

        if student["projects_count"] < 2:
            weaknesses.append("Projects")

        if student["programming_score"] < 60:
            weaknesses.append("Programming")

        if student["communication_score"] < 60:
            weaknesses.append("Communication")

        if student["resume_score"] < 60:
            weaknesses.append("Resume")

        if student["dsa_score"] < 60:
            weaknesses.append("DSA")

        if student["sql_score"] < 60:
            weaknesses.append("SQL")

        if student["github_activity_score"] < 50:
            weaknesses.append("GitHub")

        if student["linkedin_activity_score"] < 50:
            weaknesses.append("LinkedIn")

        if student["cgpa"] < 7:
            weaknesses.append("Academics")

        # ==========================================================
        # RECOMMENDATIONS
        # ==========================================================

        recommendations = []

        if "Projects" in weaknesses:
            recommendations.append(
                "Build 2-3 real-world projects and upload them on GitHub."
            )

        if "Programming" in weaknesses:
            recommendations.append(
                "Practice programming for at least 1 hour daily."
            )

        if "DSA" in weaknesses:
            recommendations.append(
                "Solve 2-3 DSA questions daily on LeetCode."
            )

        if "SQL" in weaknesses:
            recommendations.append(
                "Learn SQL joins, aggregation and practice interview questions."
            )

        if "Communication" in weaknesses:
            recommendations.append(
                "Improve communication by giving mock interviews and presentations."
            )

        if "Resume" in weaknesses:
            recommendations.append(
                "Create an ATS-friendly one-page resume."
            )

        if "GitHub" in weaknesses:
            recommendations.append(
                "Upload your projects regularly on GitHub."
            )

        if "LinkedIn" in weaknesses:
            recommendations.append(
                "Keep your LinkedIn profile updated and post your projects."
            )

        if "Academics" in weaknesses:
            recommendations.append(
                "Focus on improving CGPA and semester performance."
            )

        # ==========================================================
        # RETURN JSON
        # ==========================================================

        return jsonify({

            "academic_category": academic_category,

            "employability_score": round(
                employability_score,
                2
            ),

            "placement_probability": placement_probability,

            "strengths": strengths,

            "weaknesses": weaknesses,

            "recommendations": recommendations

        })

    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500

# ==========================================================
# AI ROADMAP
# ==========================================================

@app.route("/generate-roadmap", methods=["POST"])
def generate_ai_roadmap():

    try:

        data = request.get_json()

        roadmap = ai_generate_roadmap(data)

        return jsonify({
            "intro": "Your Personalized AI Roadmap",
            "weeks": [
                {
                    "title": "AI Mentor Response",
                    "desc": roadmap
                }
            ]
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }),500

# ==========================================================
# Resume Analyser
# ==========================================================

@app.route("/analyze-resume", methods=["POST"])
def analyze_resume_route():

    try:

        if "resume" not in request.files:

            return jsonify({

                "error": "No file uploaded"

            }),400

        file = request.files["resume"]

        filename = secure_filename(file.filename)

        filepath = os.path.join(

            app.config["UPLOAD_FOLDER"],

            filename

        )

        file.save(filepath)

        result = analyze_resume(filepath)

        os.remove(filepath)

        return jsonify({

            "analysis": result

        })

    except Exception as e:

        return jsonify({

            "error": str(e)

        }),500

# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )