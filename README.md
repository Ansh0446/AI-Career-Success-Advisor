<div align="center">

# 🚀 AI Career Success Advisor

### An AI-powered career intelligence platform for students

**Predict your academic performance · Get your employability score · Analyze your resume · Generate an AI career roadmap · Chat with an AI mentor**

<br/>

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1.1-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Scikit-learn](https://img.shields.io/badge/Scikit--learn-1.5.2-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

**[🌐 Live Demo](https://ai-career-success-advisor-production.up.railway.app)** &nbsp;·&nbsp; **[📂 GitHub](https://github.com/Ansh0446/AI-Career-Success-Advisor)**

</div>

---

## 📌 Project Overview

**AI Career Success Advisor** is a full-stack web application that combines trained **Machine Learning models** with **Google Gemini 2.5 Flash** to give students a clear, data-driven picture of their career readiness.

A student fills in their academic profile — CGPA, attendance, scores, projects, internships — and the system runs it through two ML models to predict:

- Their **academic performance category** (Excellent / Good / Average / At Risk)
- Their **employability score** (0–100)
- Their **placement probability** (%)
- Identified **strengths and weaknesses**
- Personalized **action recommendations**

From those results, the student can generate a **personalized 30-day AI career roadmap**, get their **resume reviewed by Gemini AI**, browse **role-specific curated learning resources**, or ask follow-up questions through the **AI career chatbot**.

---

## ✨ Features

### 🎯 Career Prediction System
- Predicts **academic category**: Excellent, Good, Average, or At Risk
- Predicts an **employability score** out of 100
- Estimates **placement probability** as a percentage
- Automatically identifies **strengths** and **areas to improve**
- Generates **personalized recommendations** for each weak area
- Supports 6 degrees, multiple branches, 3 career goals, 6 target roles, and 2 sectors

### 🤖 AI Mentor — 30-Day Roadmap Generator
- Powered by **Google Gemini 2.5 Flash**
- Reads the student's full ML prediction result (scores, strengths, weaknesses, target role)
- Generates a structured **week-by-week 30-day roadmap** including:
  - Weekly goal and title
  - Topics to cover
  - Hands-on tasks
  - Projects to build
  - Learning resources
  - Interview preparation tips

### 📄 Resume Analyzer
- Accepts **PDF resume uploads** (up to 10 MB)
- Extracts text using **PyPDF2**
- Sends the content to **Gemini 2.5 Flash** for ATS-style analysis
- Returns a structured breakdown across 7 sections:
  - ATS Score (0–100) with animated gauge
  - Strengths
  - Weaknesses
  - Missing Skills
  - Projects Review
  - Resume Formatting
  - Interview Readiness
  - Final Suggestions
- Real upload progress bar via XHR

### 💬 AI Career Chatbot (Floating Widget)
- Powered by **Google Gemini 2.5 Flash**
- Floats on the main page as a chat widget
- Context-aware: reads the student's prediction results (target role, scores, weaknesses) if they've run the predictor
- Supports **quick action cards**: Analyze Resume, Generate Roadmap, Mock Interview, DSA Planner, GitHub Review, LinkedIn Review, and more
- **Markdown rendering** with bold, italic, code blocks, lists, and links
- **Voice input** via the Web Speech API (Chrome / Edge)
- **Text-to-speech** for AI responses
- **Chat export** as a `.txt` file
- Online/offline status detection
- Collapsible long responses with "Show more"
- Copy, Like/Dislike, Retry, and Speak actions on each message

### 📚 Personalized Career Resources
- Dynamically loaded from `career_resources.json` via `GET /api/resources/<role>`
- Matched to the student's **selected target role** after running the predictor
- Resources organized into 6 categories:
  - Courses
  - Certifications
  - Roadmaps
  - YouTube Channels
  - Practice Platforms
  - Books
- Each resource card shows difficulty level, time estimate, source label, and a direct CTA link

### 📦 Downloadable Resources
Six static files available for direct download:

| Resource | Format |
|---|---|
| Sample Resume | PDF |
| Resume Templates | ZIP (5 editable layouts) |
| DSA Sheet | PDF |
| SQL Placement Notes | PDF |
| Interview Questions | PDF |
| GitHub Templates | PDF |

### 🔐 Authentication (Firebase)
- **Email + Password** sign-up and login
- **Google OAuth** one-click login
- **Forgot password** via email reset
- Password strength meter on sign-up
- Persistent login state across sessions (Firebase Auth)
- Firestore used to persist the hero dashboard state between sessions
- Login / Logout reflected in the navbar in real time

### 🎨 UI / UX
- **Dark and Light theme** with localStorage persistence
- **Animated neural network canvas** background
- **Glassmorphism** card design system
- **Scroll reveal** animations on all sections
- Fully **responsive** — desktop, tablet, and mobile
- Animated circular gauges for scores
- Animated number counters
- AI progress overlay with step indicators during prediction

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.10+, Flask 3.1.1 |
| **ML — Classifier** | Scikit-learn — Random Forest Classifier |
| **ML — Regressor** | Scikit-learn — Random Forest Regressor |
| **ML — Data** | Pandas 2.2.3, NumPy 1.26.4 |
| **ML — Serialization** | Joblib 1.4.2 |
| **Generative AI** | Google Gemini 2.5 Flash (`google-genai` SDK) |
| **PDF Processing** | PyPDF2 3.0.1 |
| **Authentication** | Firebase Authentication (Email, Google OAuth) |
| **Database** | Firebase Firestore (user session persistence) |
| **Frontend** | HTML5, Vanilla CSS3, Vanilla JavaScript |
| **Fonts** | Space Grotesk, Inter, JetBrains Mono (Google Fonts) |
| **WSGI Server** | Gunicorn 23.0.0 |
| **Environment** | python-dotenv 1.0.1 |

---

## 🏗 Project Architecture

```
Browser (HTML / CSS / JS)
        │
        │  HTTP / JSON
        ▼
Flask Application (app.py)
        │
   ┌────┴──────────────────────┐
   │                           │
   ▼                           ▼
ML Pipeline                Gemini AI Layer
(predict route)         (mentor / chat / resume)
   │                           │
   ├─ Academic Model            ├─ mentor.py       → 30-day roadmap
   │  (RF Classifier)          ├─ chat.py         → chatbot replies
   │                           └─ resume_analyzer.py → ATS review
   └─ Employability Model
      (RF Regressor)

        │
        ▼
  Firebase Auth + Firestore
  (login.js / firebase.js)
```

### API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Serves the main application page |
| `GET` | `/login` | Serves the login / sign-up page |
| `POST` | `/predict` | Runs both ML models, returns prediction JSON |
| `POST` | `/generate-roadmap` | Generates a 30-day roadmap via Gemini |
| `POST` | `/analyze-resume` | Analyzes uploaded PDF resume via Gemini |
| `POST` | `/chat` | Returns an AI chatbot reply via Gemini |
| `GET` | `/api/resources/<role>` | Returns curated resources for a target role |

---

## 🧠 Machine Learning Pipeline

### Models

| Model | Algorithm | Task | Metric |
|---|---|---|---|
| **Academic Model** | Random Forest Classifier | Predict academic category | Accuracy: **83.2%** |
| **Employability Model** | Random Forest Regressor | Predict employability score | R² Score: **0.97** |

### Input Features (28 total)

The prediction takes in 28 student profile features:

| Category | Features |
|---|---|
| **Academic** | `degree`, `branch`, `year`, `cgpa`, `attendance`, `backlogs` |
| **Study Habits** | `study_hours`, `self_learning_hours`, `sleep_hours`, `screen_time` |
| **Scores** | `assignment_score`, `internal_marks`, `programming_score`, `sql_score`, `dsa_score`, `communication_score`, `aptitude_score`, `resume_score`, `ats_score` |
| **Activity** | `projects_count`, `hackathons_count`, `certifications_count`, `internships_count`, `github_activity_score`, `linkedin_activity_score` |
| **Career Goal** | `goal`, `target_role`, `sector` |

### Pipeline Flow

```
Raw Form Input
      │
      ▼
Label Encoding (degree, branch, goal, target_role, sector)
      │
      ▼
Random Forest Classifier → Academic Category (Excellent / Good / Average / At Risk)
      │
      ▼
Academic Score Calculation
(CGPA × 7 + study_hours × 3 + self_learning × 2 + projects × 2 + attendance × 0.05 − backlogs × 8 − screen_time)
      │
      ▼
Random Forest Regressor → Employability Score (0–100)
      │
      ▼
Placement Probability = min(employability_score × 0.90, 100)
      │
      ▼
Rule-based Strengths & Weaknesses Detection
      │
      ▼
Recommendation Generation
```

---

## 🤖 Google Gemini AI Integration

The app uses the **`google-genai` Python SDK** with the **`gemini-2.5-flash`** model across three independent modules:

### 1. `mentor.py` — AI Roadmap Generator
Receives the full student profile (degree, branch, CGPA, academic category, employability score, placement probability, target role, goal, strengths, weaknesses, recommendations) and instructs Gemini to return a **strict JSON schema** of 4 weekly roadmap objects, each containing: title, goal, topics, tasks, projects, resources, and interview_preparation.

### 2. `chat.py` — AI Career Chatbot
- Uses the student's live prediction context (if available) as a system prompt prefix
- Handles simple greetings with hardcoded fast responses to save API calls
- Passes complex questions to Gemini with the student's full profile as context
- Instructs Gemini to personalize responses to the student's target role and weak areas

### 3. `resume_analyzer.py` — Resume ATS Reviewer
- Extracts all text from the uploaded PDF using PyPDF2
- Sends the raw text to Gemini with a structured prompt requesting 7 analysis sections
- The frontend parses the response text into cards: ATS Score, Strengths, Weaknesses, Missing Skills, Projects Review, Resume Formatting, Interview Readiness, Final Suggestions

---

## 🔐 Authentication

Authentication is handled entirely client-side using the **Firebase Web SDK v12** (`firebase.js`, `login.js`).

| Feature | Implementation |
|---|---|
| Email sign-up | `createUserWithEmailAndPassword` |
| Email login | `signInWithEmailAndPassword` |
| Google OAuth | `signInWithPopup` with `GoogleAuthProvider` |
| Password reset | `sendPasswordResetEmail` |
| Session state | `onAuthStateChanged` listener in `script.js` |
| User data persistence | Firestore `users/{uid}` document |
| Logout | `signOut` → redirect to `/login` |

After login, the navbar Login button switches to Logout in real time. The hero dashboard state (confidence %, profile signals, recommendation count) is saved to Firestore and restored on the next session.

---

## 📁 Folder Structure

```
AI-Career-Success-Advisor/
│
├── app.py                        # Flask application & all API routes
├── mentor.py                     # Gemini AI roadmap generator
├── chat.py                       # Gemini AI chatbot logic
├── resume_analyzer.py            # Gemini AI + PyPDF2 resume analysis
├── gemini_service.py             # Shared Gemini API client
├── predict.py                    # Standalone prediction script (dev/testing)
├── preprocessing.py              # Data preprocessing & label encoder export
├── train_academic_model.py       # Trains the Random Forest Classifier
├── train_employability_model.py  # Trains the Random Forest Regressor
├── visualization.py              # Data visualization utilities
│
├── requirements.txt              # Python dependencies
├── Procfile                      # Gunicorn command for deployment
├── runtime.txt                   # Python version pin
├── .env.example                  # Environment variable template
│
├── models/
│   ├── academic_model.pkl        # Trained RF Classifier
│   ├── employability_model.pkl   # Trained RF Regressor
│   ├── le_degree.pkl             # Label encoder — degree
│   ├── le_branch.pkl             # Label encoder — branch
│   ├── le_goal.pkl               # Label encoder — goal
│   ├── le_role.pkl               # Label encoder — target role
│   ├── le_sector.pkl             # Label encoder — sector
│   └── le_academic.pkl           # Label encoder — academic category
│
├── dataset/
│   └── datasetv5.csv             # Training dataset
│
├── static/
│   ├── style.css                 # Main stylesheet (dark/light theme, layout)
│   ├── resume_section.css        # Resume analyzer section styles
│   ├── chatbot.css               # Chatbot widget styles
│   ├── login.css                 # Login page styles
│   ├── signup.css                # Sign-up page styles
│   ├── script.js                 # Core app logic (prediction, roadmap, nav)
│   ├── resume_section.js         # Resume upload, XHR, and result rendering
│   ├── chatbot.js                # Chatbot widget (voice, history, settings)
│   ├── loadResources.js          # Personalized career resources rendering
│   ├── login.js                  # Firebase login / OAuth / forgot password
│   ├── signup.js                 # Firebase sign-up form
│   ├── firebase.js               # Firebase app initialization & exports
│   ├── data/
│   │   ├── career_data.json      # Degree → Branch → Roles mapping
│   │   └── career_resources.json # Role-specific curated resources
│   └── resources/
│       ├── Sample-Resume.pdf
│       ├── Resume-Templates.zip
│       ├── DSA-sheet.pdf
│       ├── SQL-Placement-Notes.pdf
│       ├── Interview-Questions.pdf
│       └── Github-Templates.pdf
│
├── templates/
│   ├── index.html                # Main single-page application
│   ├── login.html                # Login & sign-in page
│   └── signup.html               # Create account page
│
└── uploads/                      # Temporary resume upload storage (auto-cleared)
```

---

## ⚙️ Installation & Local Setup

### Prerequisites

- Python 3.10+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A [Firebase project](https://console.firebase.google.com/) with Authentication and Firestore enabled

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/Ansh0446/AI-Career-Success-Advisor.git
cd AI-Career-Success-Advisor
```

**2. Install Python dependencies**
```bash
pip install -r requirements.txt
```

**3. Set up environment variables**

Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**4. Set up Firebase**

Update `static/firebase.js` with your Firebase project configuration:
```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

**5. Run the application**
```bash
python app.py
```

**6. Open in your browser**
```
http://127.0.0.1:5000
```

---

## 🌐 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key from Google AI Studio | ✅ Yes |

The Firebase configuration lives in `static/firebase.js` as a client-side object (standard for Firebase Web SDK projects).

---

## 📷 Screenshots

> Live preview: [ai-career-success-advisor-production.up.railway.app](https://ai-career-success-advisor-production.up.railway.app)

| Section | Description |
|---|---|
| **Hero** | Animated neural network background, feature highlights, post-prediction dashboard |
| **Predictor** | Two-tab form — Student Performance (sliders) + Career Success (counters + selects) |
| **Results** | Academic category badge, employability gauge, placement bar, strengths/weaknesses tags, recommendations list |
| **AI Mentor** | 30-day week-by-week roadmap with topics, tasks, projects, and interview prep |
| **Resume Analyzer** | Drag-and-drop upload, ATS gauge, 7-section analysis cards |
| **Resources** | Static downloads + role-matched dynamic resource cards with difficulty and time estimates |
| **Chatbot** | Floating widget with voice input, context panel, quick actions, chat history, settings |

---

## 🚀 Deployment

The application is deployed on **Railway** using **Gunicorn**:

```
Procfile: web: gunicorn app:app
```

The `runtime.txt` pins the Python version for the deployment environment.

---

## 🔮 Future Improvements

- Company-specific placement preparation packs
- Multi-language support (Hindi, regional languages)
- AI Interview Coach with live mock interview sessions
- Resume builder with ATS-optimized templates
- Leaderboard and peer comparison dashboard
- Email digest with weekly progress reports
- Integration with LinkedIn API for live profile analysis

---

## 👨‍💻 Author

**Ansh Banga**

B.Tech — Artificial Intelligence & Data Science
Vivekananda Institute of Professional Studies (VIPS), Delhi

[![GitHub](https://img.shields.io/badge/GitHub-Ansh0446-181717?style=flat-square&logo=github)](https://github.com/Ansh0446)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Ansh%20Banga-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/ansh-banga-775275330/)
[![Email](https://img.shields.io/badge/Email-anshbanga4@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:anshbanga4@gmail.com)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

⭐ **If this project helped you, consider giving it a star!**

</div>
