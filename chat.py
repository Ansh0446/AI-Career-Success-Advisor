from gemini_service import client

# ==========================================================
# GENERIC RESPONSES
# ==========================================================

GENERIC_RESPONSES = {

    "hi": (
        "Hi! 👋 I'm CareerAI.\n\n"
        "I can help you with:\n"
        "• Career Guidance\n"
        "• Resume Review\n"
        "• AI Roadmaps\n"
        "• Placement Preparation\n"
        "• Interview Preparation\n"
        "• AI/ML Projects\n"
        "• Skill Development"
    ),

    "hello": "Hello! 👋 How can I help you with your career today?",

    "hey": "Hey! 👋 What would you like to work on today?",

    "help": (
        "You can ask me things like:\n\n"
        "• Review my resume\n"
        "• Suggest AI projects\n"
        "• Improve my placement chances\n"
        "• Create a study plan\n"
        "• Explain DSA concepts\n"
        "• Recommend certifications"
    ),

    "thanks": "You're welcome! 😊",

    "thank you": "Happy to help! 🚀",

    "bye": "Good luck with your career journey! 🚀",

    "who are you": (
        "I'm CareerAI, your personal AI Career Advisor. "
        "I can help with placements, resumes, interview preparation, roadmaps and career guidance."
    )
}


# ==========================================================
# BUILD CONTEXT
# ==========================================================

def build_context(context):

    if not context:
        return ""

    strengths = context.get("strengths") or []
    weaknesses = context.get("weaknesses") or []
    recommendations = context.get("recommendations") or []

    return f"""
=========================
STUDENT PROFILE
=========================

Degree: {context.get("degree","")}
Branch: {context.get("branch","")}
Year: {context.get("year","")}

CGPA: {context.get("cgpa","")}

Academic Category:
{context.get("academic_category","")}

Employability Score:
{context.get("employability_score","")}

Placement Probability:
{context.get("placement_probability","")}

Target Role:
{context.get("target_role","")}

Career Goal:
{context.get("goal","")}

Strengths:
{", ".join(strengths)}

Weaknesses:
{", ".join(weaknesses)}

Recommendations:
{", ".join(recommendations)}
"""


# ==========================================================
# MAIN CHAT FUNCTION
# ==========================================================

def generate_chat_response(message, context=None):

    if not message:
        return "Please type a message."

    msg = message.lower().strip()

    if msg in GENERIC_RESPONSES:
        return GENERIC_RESPONSES[msg]

    context_text = build_context(context)

    prompt = f"""
You are CareerAI.

You are an expert AI Career Mentor.

Never say you don't know the student's profile if profile information is provided below.

If the question is related to career, placements, resume, roadmap,
skills, interviews, AI, ML, DSA, projects or study planning,
ALWAYS use the student's profile.

If the question is general
(example: "What is Machine Learning?")
simply answer normally.

Student Profile:

{context_text}

User Question:

{message}

Rules:

- Give practical advice.
- Personalize whenever possible.
- Use bullet points.
- Don't invent profile information.
- Keep answers concise unless detailed explanation is requested.
- Return plain text only.
"""

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text.strip()

    except Exception as e:

        print("CHAT ERROR:", e)

        return (
            "I'm having trouble connecting to Gemini AI right now. "
            "Please try again in a moment."
        )