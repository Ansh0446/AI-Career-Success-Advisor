from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def generate_roadmap(student):

    prompt = f"""
You are an expert AI Career Mentor.

Analyze the student's profile and create a highly personalized 30-day roadmap.

Student Profile

Degree : {student['degree']}
Branch : {student['branch']}
Year : {student['year']}

CGPA : {student['cgpa']}

Academic Category : {student['academic_category']}

Employability Score : {student['employability_score']}

Placement Probability : {student['placement_probability']}

Target Role : {student['target_role']}

Career Goal : {student['goal']}

Strengths :
{", ".join(student["strengths"])}

Weaknesses :
{", ".join(student["weaknesses"])}

Recommendations :
{", ".join(student["recommendations"])}

Instructions:

Generate a practical 30-day roadmap.

Divide into:

Week 1

Week 2

Week 3

Week 4

Each week should include:

Topics to study

Projects

Coding Practice

Resources

Daily Tasks

Interview Preparation

Keep the roadmap concise, practical and personalized.

Return only plain text.

"""
    response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)
    return response.text