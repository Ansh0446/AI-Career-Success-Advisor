from gemini_service import client

# ==========================================================
# GENERIC RESPONSES
# ==========================================================

GENERIC_RESPONSES = {

    "hi": (
        "Hi! 👋 I'm your AI Career Advisor.\n\n"
        "I can help you with:\n"
        "• Career Guidance\n"
        "• Resume Review\n"
        "• AI Roadmaps\n"
        "• Placement Preparation\n"
        "• Interview Preparation\n"
        "• AI/ML Projects\n"
        "• Skill Development"
    ),

    "hello": (
        "Hello! 👋 How can I help you with your career today?"
    ),

    "hey": (
        "Hey! 👋 What would you like to work on today?"
    ),

    "help": (
        "You can ask me things like:\n\n"
        "• Review my resume\n"
        "• Suggest AI projects\n"
        "• Improve my placement chances\n"
        "• Create a study plan\n"
        "• Explain DSA concepts\n"
        "• Recommend certifications"
    ),

    "thanks": (
        "You're welcome! 😊"
    ),

    "thank you": (
        "Happy to help! 🚀"
    ),

    "bye": (
        "Good luck with your career journey! 🚀"
    ),

    "who are you": (
        "I'm your AI Career Advisor. I help students improve their skills, resumes, placements and career roadmap."
    )

}

# ==========================================================
# MAIN CHAT FUNCTION
# ==========================================================

def generate_chat_response(message, context=None):

    if not message:
        return "Please type a message."

    msg = message.lower().strip()

    # Generic instant responses
    if msg in GENERIC_RESPONSES:
        return GENERIC_RESPONSES[msg]

    # Gemini AI
    try:

        prompt = f"""
You are CareerAI, an intelligent AI Career Advisor.

You help students with:

- Career guidance
- Resume improvement
- AI Roadmaps
- DSA
- Placement preparation
- Interview preparation
- AI/ML
- Software Development

Answer the user's question professionally.

Keep responses concise unless the user asks for a detailed explanation.

User Question:
{message}

Return only plain text.
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text

    except Exception as e:
      print("CHAT ERROR:", e)

      return f"ERROR: {e}"