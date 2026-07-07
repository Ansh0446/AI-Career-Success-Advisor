from gemini_service import client
import json
def generate_roadmap(student):

    prompt = f"""
You are CareerAI, an expert AI Career Mentor.

You must generate a highly personalized 30-day roadmap.

Student Profile

Degree: {student['degree']}
Branch: {student['branch']}
Year: {student['year']}

CGPA: {student['cgpa']}

Academic Category: {student['academic_category']}

Employability Score: {student['employability_score']}

Placement Probability: {student['placement_probability']}

Target Role: {student['target_role']}

Career Goal: {student['goal']}

Strengths:
{", ".join(student["strengths"])}

Weaknesses:
{", ".join(student["weaknesses"])}

Recommendations:
{", ".join(student["recommendations"])}

------------------------------------------------

IMPORTANT

Return ONLY valid JSON.

Do NOT return markdown.

Do NOT return explanations.

Do NOT wrap JSON inside ```.

Do NOT write any introductory text.

The response MUST exactly follow this schema:

{{
  "student_summary": {{
    "target_role": "",
    "goal": "",
    "academic_category": "",
    "employability_score": 0,
    "placement_probability": 0
  }},
  "weeks": [
    {{
      "week": 1,
      "title": "",
      "goal": "",
      "topics": [],
      "tasks": [],
      "projects": [],
      "resources": [],
      "interview_preparation": []
    }},
    {{
      "week": 2,
      "title": "",
      "goal": "",
      "topics": [],
      "tasks": [],
      "projects": [],
      "resources": [],
      "interview_preparation": []
    }},
    {{
      "week": 3,
      "title": "",
      "goal": "",
      "topics": [],
      "tasks": [],
      "projects": [],
      "resources": [],
      "interview_preparation": []
    }},
    {{
      "week": 4,
      "title": "",
      "goal": "",
      "topics": [],
      "tasks": [],
      "projects": [],
      "resources": [],
      "interview_preparation": []
    }}
  ]
}}

Generate realistic content.

Return ONLY JSON.
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
)

    try:
        return json.loads(response.text)

    except Exception:
      cleaned = (
        response.text
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(cleaned)