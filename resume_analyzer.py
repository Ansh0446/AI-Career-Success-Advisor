import os
import PyPDF2
from mentor import client


def analyze_resume(pdf_path):

    text = ""

    with open(pdf_path, "rb") as file:

        reader = PyPDF2.PdfReader(file)

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text

    prompt = f"""
You are an expert ATS Resume Reviewer.

Analyze the following resume.

{text}

Return the response in this format:

ATS Score:
(xx/100)

Strengths:
- ...

Weaknesses:
- ...

Missing Skills:
- ...

Projects Review:
- ...

Resume Formatting:
- ...

Interview Readiness:
- ...

Final Suggestions:
- ...
"""
    response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

    return response.text