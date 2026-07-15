/* ============================================================
   AI Career Success Advisor — interactivity
   ============================================================ */
import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

(function () {
  "use strict";

// ==========================================================
// CareerAI Global Context
// ==========================================================
window.CareerAIContext = null;

  /* ---------------------------------------------------------
     0. Footer year
  --------------------------------------------------------- */
  var footerYear = document.getElementById("footerYear");

if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
}
  /* ---------------------------------------------------------
     1. Theme toggle (persisted in localStorage)
  --------------------------------------------------------- */
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var savedTheme = localStorage.getItem("aica-theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = current === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      localStorage.setItem("aica-theme", next);
    });
  }

  /* ---------------------------------------------------------
     2. Mobile nav
  --------------------------------------------------------- */
  var hamburger = document.getElementById("hamburger");
  var navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      hamburger.classList.toggle("open", isOpen);
      hamburger.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        hamburger.classList.remove("open");
      });
    });
  }

  /* Active nav link on scroll */
  var sections = ["home", "predictor", "mentor", "resources", "about"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navAnchors = document.querySelectorAll(".nav-link");

  function syncActiveNav() {
    var current = sections[0];
    sections.forEach(function (sec) {
      if (window.scrollY >= sec.offsetTop - 140) current = sec;
    });
    navAnchors.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current.id);
    });
  }
  window.addEventListener("scroll", syncActiveNav, { passive: true });
  syncActiveNav();

  /* ---------------------------------------------------------
     3. Scroll reveal
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------------------------------------------------------
     4. Background neural-network canvas
  --------------------------------------------------------- */
  var canvas = document.getElementById("bg-network");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var nodes = [];
    var W, H;
    var NODE_COUNT = window.innerWidth < 720 ? 32 : 60;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight * 0.55);
    }

    function makeNodes() {
      nodes = [];
      for (var i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var linkDist = 150;

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!reduceMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
      }

      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.strokeStyle = "rgba(150,120,255," + (1 - dist / linkDist) * 0.14 + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach(function (n) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,150,255,0.55)";
        ctx.fill();
      });

      if (!reduceMotion) requestAnimationFrame(draw);
    }

    resize();
    makeNodes();
    draw();
    window.addEventListener("resize", function () {
      resize();
      makeNodes();
      if (reduceMotion) draw();
    });
  }

  /* ---------------------------------------------------------
     5. Degree → Branch dynamic dropdown
  --------------------------------------------------------- */
  var BRANCH_MAP = {
    "B.Tech/B.E.": [
      "AI & Data Science",
      "Computer Science",
      "Information Technology",
      "Electronics & Communication",
      "Electrical Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Chemical Engineering",
      "Biotechnology",
      "Robotics",
      "Aerospace Engineering",
      "Agricultural Engineering",
      "Automobile Engineering",
      "Environmental Engineering",
      "Food Technology",
      "Metallurgical Engineering",
      "Textile Engineering",
      "Electronics & Instrumentation",
      "Mathematics & Computing"
    ],

    "BCA": [
      "General",
      "Data Science",
      "Cyber Security",
      "Cloud Computing"
    ],

    "BS (Data Science & AI)": [
      "AI & Data Science",
      "Statistics",
      "Mathematics & Computing"
    ],

    "M.Tech/M.E.": [
      "Computer Science",
      "AI & Data Science",
      "Information Technology",
      "Electronics & Communication"
    ],

    "MCA": [
      "Computer Science",
      "Information Technology"
    ],

    "MSc": [
      "Physics",
      "Chemistry",
      "Mathematics & Computing",
      "Statistics"
    ],

    "PhD": [
      "Computer Science",
      "AI & Data Science",
      "Physics",
      "Chemistry",
      "Economics"
    ]
  };

  var degreeSelect = document.getElementById("degree");
  var branchSelect = document.getElementById("branch");
  var targetRoleSelect = document.getElementById("target_role");

  function populateBranches(degree) {

    branchSelect.innerHTML = "";

    var branches = BRANCH_MAP[degree];

    if (!branches) {

        branchSelect.disabled = true;

        var placeholder = document.createElement("option");

        placeholder.value = "";

        placeholder.disabled = true;

        placeholder.selected = true;

        placeholder.textContent = "Select degree first";

        branchSelect.appendChild(placeholder);

        return;

    }

    branchSelect.disabled = false;

    var ph = document.createElement("option");

    ph.value = "";

    ph.disabled = true;

    ph.selected = true;

    ph.textContent = "Select branch";

    branchSelect.appendChild(ph);

    branches.forEach(function (b) {

        var opt = document.createElement("option");

        opt.value = b;

        opt.textContent = b;

        branchSelect.appendChild(opt);

    });

}


async function populateTargetRoles(degree, branch) {

    if (!targetRoleSelect) return;

    targetRoleSelect.innerHTML = "";

    const placeholder = document.createElement("option");

    placeholder.value = "";

    placeholder.textContent = "Select Target Role";

    placeholder.disabled = true;

    placeholder.selected = true;

    targetRoleSelect.appendChild(placeholder);

    if (!degree || !branch) {

        targetRoleSelect.disabled = true;

        return;

    }

    try {

        const response = await fetch("/static/data/career_data.json");

        const data = await response.json();

        const roles = data?.[degree]?.[branch]?.roles || [];

        targetRoleSelect.disabled = false;

        roles.forEach(role => {

            const option = document.createElement("option");

            option.value = role.title;

            option.textContent = role.title;

            targetRoleSelect.appendChild(option);

        });

    } catch (error) {

        console.error("Unable to load career data:", error);

    }

}
  if (degreeSelect && branchSelect) {
    degreeSelect.addEventListener("change", function () {
      populateBranches(degreeSelect.value);
      targetRoleSelect.disabled = true;
      targetRoleSelect.innerHTML =
          '<option selected disabled>Select Target Role</option>';
    });
  }
branchSelect.addEventListener("change", function () {

    populateTargetRoles(
        degreeSelect.value,
        branchSelect.value
    );

});
document.querySelectorAll("select").forEach(function(select){

    select.addEventListener("change", function(){

        this.classList.remove("field-invalid");

        this.closest(".field")
            ?.querySelector(".field-error")
            ?.remove();

    });

});
  /* ---------------------------------------------------------
     6. Sliders — live values + filled track
  --------------------------------------------------------- */
  function formatSliderValue(input) {
    var id = input.id;
    var val = parseFloat(input.value);
    if (id === "attendance") return val + "%";
    return val % 1 === 0 ? String(val) : String(val);
  }

  function updateSliderFill(input) {
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var val = parseFloat(input.value);
    var pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

document.querySelectorAll('input[type="range"].slider').forEach(function (input) {
    var output = document.getElementById(input.id + "Value");
    // Slider starts from minimum position
    input.value = input.min;
    updateSliderFill(input);
    // User has not touched this slider yet
    input.dataset.touched = "false";
    // Show placeholder
    if (output) {
        output.textContent = "—";
    }
    input.addEventListener("input", function () {
        input.dataset.touched = "true";
        updateSliderFill(input);
        if (output) {
            output.textContent = formatSliderValue(input);
        }
        input.classList.remove("slider-error");
    });
});

  /* ---------------------------------------------------------
     7. Counters (plus / minus)
  --------------------------------------------------------- */
  document.querySelectorAll(".counter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      var input = document.getElementById(targetId);
      if (!input) return;
      var min = parseInt(input.min, 10) || 0;
      var max = parseInt(input.max, 10) || 100;
      var val = parseInt(input.value, 10) || 0;
      val += btn.classList.contains("plus") ? 1 : -1;
      val = Math.max(min, Math.min(max, val));
      input.value = val;
    });
  });

  /* ---------------------------------------------------------
     8. Tabs
  --------------------------------------------------------- */
  var tabBtns = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-tab");
      tabBtns.forEach(function (b) {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      tabPanels.forEach(function (panel) {
        var match = panel.getAttribute("data-panel") === target;
        panel.hidden = !match;
        if (match) panel.classList.add("active");
        else panel.classList.remove("active");
      });
    });
  });

  /* ---------------------------------------------------------
     9. Analyze My Career — submit to Flask backend
  --------------------------------------------------------- */
  var form = document.getElementById("careerForm");
  var analyzeBtn = document.getElementById("analyzeBtn");
  var resultsSection = document.getElementById("resultsSection");

  function collectFormData() {
    var data = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.name) continue;
      if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    }
    return data;
  }

  function setLoading(btn, isLoading) {
    btn.classList.toggle("is-loading", isLoading);
    btn.disabled = isLoading;
  }

  var CATEGORY_CLASS = {
    Excellent: "cat-excellent",
    Good: "cat-good",
    Average: "cat-average",
    "At Risk": "cat-atrisk",
  };

  function renderResults(result) {
    // Academic category
    var badge = document.getElementById("academicCategoryBadge");
    var text = document.getElementById("academicCategoryText");
    var category = result.academic_category || "Good";
    Object.values(CATEGORY_CLASS).forEach(function (c) { badge.classList.remove(c); });
    badge.classList.add(CATEGORY_CLASS[category] || "cat-good");
    text.textContent = category;

    // Employability gauge
    var empScore = Math.max(0, Math.min(100, Number(result.employability_score) || 0));
    var circle = document.getElementById("employabilityCircle");
    var circumference = 2 * Math.PI * 58; // r=58
    var offset = circumference - (empScore / 100) * circumference;
    document.getElementById("employabilityValue").textContent = "0";
    requestAnimationFrame(function () {
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = offset;
      animateNumber(document.getElementById("employabilityValue"), 0, empScore, 1000);
    });

    // Placement bar
    var placement = Math.max(0, Math.min(100, Number(result.placement_probability) || 0));
    var bar = document.getElementById("placementBar");
    var placementValueEl = document.getElementById("placementValue");
    requestAnimationFrame(function () {
      bar.style.width = placement + "%";
      animateNumber(placementValueEl, 0, placement, 1000, "%");
    });

    // Strengths
    var strengthsList = document.getElementById("strengthsList");
    strengthsList.innerHTML = "";
    (result.strengths || []).forEach(function (s) {
      var span = document.createElement("span");
      span.textContent = "✓ " + s;
      strengthsList.appendChild(span);
    });

    // Weaknesses
    var weaknessesList = document.getElementById("weaknessesList");
    weaknessesList.innerHTML = "";
    (result.weaknesses || []).forEach(function (w) {
      var span = document.createElement("span");
      span.textContent = "⚠ " + w;
      weaknessesList.appendChild(span);
    });

    // Recommendations
    var recList = document.getElementById("recommendationsList");
    recList.innerHTML = "";
    (result.recommendations || []).forEach(function (r) {
      var li = document.createElement("li");
      li.textContent = r;
      recList.appendChild(li);
    });

    resultsSection.hidden = false;
    document.querySelectorAll("#resultsSection .reveal").forEach(function (el) {
      el.classList.add("in-view");
    });
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    const selectedRole = document.getElementById("target_role").value;

      if (selectedRole) {
        loadResources(selectedRole);
  }
  }

  function animateNumber(el, from, to, duration, suffix) {
    suffix = suffix || "";
    var start = performance.now();
    function tick(now) {
      var progress = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(from + (to - from) * eased);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Demo fallback so the UI is browsable before the backend is wired up
  function buildDemoResult(payload) {
    var weak = [];
    ["sql_score", "dsa_score", "communication_score", "aptitude_score"].forEach(function (key) {
      if (Number(payload[key]) < 65) weak.push(key.replace("_score", "").replace("_", " "));
    });
    if (weak.length === 0) weak = ["SQL", "DSA"];

    return {
      academic_category: Number(payload.cgpa) >= 8.5 ? "Excellent" : Number(payload.cgpa) >= 7 ? "Good" : Number(payload.cgpa) >= 6 ? "Average" : "At Risk",
      employability_score: 78,
      placement_probability: 74,
      strengths: ["Projects", "Programming", "Resume", "Communication", "DSA"],
      weaknesses: weak,
      recommendations: [
        "Improve DSA problem-solving consistency",
        "Build one more portfolio-ready project",
        "Sharpen verbal and written communication skills",
        "Complete a structured SQL course",
        "Increase GitHub activity with regular commits",
      ],
    };
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

// Remove old validation messages
document.querySelectorAll(".field-error").forEach(el => el.remove());
document.querySelectorAll(".field-invalid").forEach(el => el.classList.remove("field-invalid"));

var firstInvalid = form.querySelector(":invalid");

if (firstInvalid) {
    var panel = firstInvalid.closest(".tab-panel");

    if (panel && panel.hidden) {
        var tabName = panel.getAttribute("data-panel");
        var tabBtn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
        if (tabBtn) tabBtn.click();

    }

    firstInvalid.classList.add("field-invalid");
    var field = firstInvalid.closest(".field");
    if (field) {

        field.insertAdjacentHTML(
            "beforeend",
            '<div class="field-error">⚠ This field is required.</div>'
        );
    }
    firstInvalid.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
    firstInvalid.focus();
    return;

}
// ================= Profile Validation =================

const untouched = Array.from(document.querySelectorAll(".slider"))
    .filter(slider => slider.dataset.touched !== "true");

if (untouched.length > 0) {

    untouched.forEach(slider => {
        slider.classList.add("slider-error");
    });

    alert("Please complete your profile before analysis.");

    untouched[0].scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    return;
}

document.querySelectorAll(".slider").forEach(slider => {
    slider.classList.remove("slider-error");
});

// ================================================

var payload = collectFormData();
setLoading(analyzeBtn, true);
startAIProgress();

fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
})

.then(function (res) {

    if (!res.ok)
        throw new Error("Backend responded with " + res.status);
    return res.json();

})

.then(function (result) {

    finishAIProgress(function () {

        renderResults(result);
// ==========================================================
// Save context for AI Chatbot
// ==========================================================

window.CareerAIContext = {

    degree: payload.degree,
    branch: payload.branch,
    year: payload.year,
    cgpa: payload.cgpa,

    goal: payload.goal,
    target_role: payload.target_role,

    academic_category: result.academic_category,

    employability_score: result.employability_score,

    placement_probability: result.placement_probability,

    strengths: result.strengths,

    weaknesses: result.weaknesses,

    recommendations: result.recommendations

};
        showHeroDashboard(
            result.prediction_confidence || 94,
            result.profile_signals || 22,
            (result.recommendations || []).length
        );
        
        setLoading(analyzeBtn, false);
    });
})

.catch(function (err) {

    console.warn("[AI Career Advisor]", err);
    const demo = buildDemoResult(payload);

    finishAIProgress(function () {

        renderResults(demo);
        showHeroDashboard(
            91,
            19,
            (demo.recommendations || []).length
        );
        setLoading(analyzeBtn, false);
    });
});
 });

}
  /* ---------------------------------------------------------
     10. AI Mentor — generate roadmap
  --------------------------------------------------------- */
  var roadmapBtn = document.getElementById("roadmapBtn");
  var chatPanel = document.getElementById("chatPanel");
  var roadmapTimeline = document.getElementById("roadmapTimeline");
  var chatIntroText = document.getElementById("chatIntroText");

  function buildDemoRoadmap(role, goal) {
    role = role || "your target role";
    return [
      { title: "Foundations & gap audit", desc: "Review " + role + " fundamentals, identify weak topics from your predictor results, and set 3 measurable goals for the month." },
      { title: "Targeted skill building", desc: "Daily focused practice on your weakest scored areas, plus one small project applying those skills." },
      { title: "Build & showcase", desc: "Ship a portfolio project aligned with " + role + ", polish your resume and GitHub profile, and start collecting feedback." },
      { title: "Outreach & interview prep", desc: "Apply toward your " + (goal || "Placement") + " goal, run mock interviews, and refine your pitch based on responses." },
    ];
  }

  function renderRoadmap(weeks) {
    roadmapTimeline.innerHTML = "";

    var SECTION_META = [
      { key: "topics",               label: "📚 Topics",               icon: "topics" },
      { key: "tasks",                label: "✅ Tasks",                icon: "tasks" },
      { key: "projects",             label: "🛠 Projects",             icon: "projects" },
      { key: "resources",            label: "🔗 Resources",            icon: "resources" },
      { key: "interview_preparation",label: "🎯 Interview Preparation", icon: "interview" }
    ];

    weeks.forEach(function (week, i) {
      var weekNum = week.week || (i + 1);

      /* Build section HTML — only render non-empty arrays */
      var sectionsHtml = "";
      SECTION_META.forEach(function (meta) {
        var items = week[meta.key];
        if (!Array.isArray(items) || items.length === 0) return;
        var listItems = items.map(function (item) {
          return "<li>" + String(item).replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</li>";
        }).join("");
        sectionsHtml +=
          "<div class=\"roadmap-section\">" +
            "<h6 class=\"roadmap-section-label\">" + meta.label + "</h6>" +
            "<ul class=\"roadmap-list\">" + listItems + "</ul>" +
          "</div>";
      });

      var item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML =
        "<div class=\"timeline-week\"><span>Week</span><span>" + weekNum + "</span></div>" +
        "<div class=\"timeline-body\">" +
          "<h5 class=\"roadmap-week-title\">" +
            (week.title ? String(week.title).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Week " + weekNum) +
          "</h5>" +
          (week.goal
            ? "<p class=\"roadmap-goal\">" +
                String(week.goal).replace(/</g, "&lt;").replace(/>/g, "&gt;") +
              "</p>"
            : "") +
          sectionsHtml +
        "</div>";

      roadmapTimeline.appendChild(item);
    });
  }

  if (roadmapBtn) {
    roadmapBtn.addEventListener("click", function () {

      // ── Guard: require a completed prediction before generating a roadmap ──
      if (resultsSection.hidden) {
        var mentorTrigger = roadmapBtn.closest(".mentor-trigger");
        var existingWarn  = mentorTrigger && mentorTrigger.querySelector(".mentor-warn");

        if (!existingWarn && mentorTrigger) {
          var warn = document.createElement("p");
          warn.className = "mentor-warn";
          warn.style.cssText = [
            "margin:10px 0 0",
            "font-size:.9rem",
            "color:var(--orange)",
            "animation:fadeIn .3s ease",
          ].join(";");
          warn.textContent = "\u26A0 Please complete the Career Predictor first so the AI Mentor can personalise your roadmap.";
          mentorTrigger.appendChild(warn);

          var warnTimer = setTimeout(function () {
            if (warn.parentNode) warn.parentNode.removeChild(warn);
          }, 4000);

          warn._timer = warnTimer;
        }

        var predictor = document.getElementById("predictor");
        if (predictor) {
          predictor.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // Remove any stale warning before proceeding
      mentorTrigger = roadmapBtn.closest(".mentor-trigger");
      var staleWarn = mentorTrigger && mentorTrigger.querySelector(".mentor-warn");
      if (staleWarn) {
        clearTimeout(staleWarn._timer);
        staleWarn.parentNode.removeChild(staleWarn);
      }
      // ─────────────────────────────────────────────────────────────────────

      setLoading(roadmapBtn, true);
      var targetRole = document.getElementById("target_role").value;
      var goal = document.getElementById("goal").value;

      fetch("/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({

    degree: form.degree.value,

    branch: form.branch.value,

    year: form.year.value,

    cgpa: form.cgpa.value,

    goal: form.goal.value,

    target_role: form.target_role.value,

    academic_category:
        document.getElementById("academicCategoryText").innerText,

    employability_score:
        document.getElementById("employabilityValue").innerText,

    placement_probability:
        document.getElementById("placementValue").innerText,

    strengths:
        Array.from(document.querySelectorAll("#strengthsList .tag"))
        .map(x => x.innerText),

    weaknesses:
        Array.from(document.querySelectorAll("#weaknessesList .tag"))
        .map(x => x.innerText),

    recommendations:
        Array.from(document.querySelectorAll("#recommendationsList li"))
        .map(x => x.innerText)
})

      })
        .then(function (res) {
          if (!res.ok) throw new Error("Backend responded with " + res.status);
          return res.json();
        })
        .then(function (data) {
          var roadmap = (data.roadmap && data.roadmap.weeks) ? data.roadmap : null;
          chatIntroText.textContent = data.intro ||
            ("Here\u2019s your personalised roadmap toward " + (targetRole || "your goal") + ".");
          if (roadmap && roadmap.weeks && roadmap.weeks.length) {
            renderRoadmap(roadmap.weeks);
          } else if (data.weeks && data.weeks.length) {
            renderRoadmap(data.weeks);
          } else {
            renderRoadmap(buildDemoRoadmap(targetRole, goal));
          }
        })
        .catch(function (err) {
          console.warn("[AI Career Advisor] /generate-roadmap unavailable, showing demo roadmap:", err.message);
          chatIntroText.textContent = targetRole
            ? "Here's your 30-day roadmap toward becoming a " + targetRole + "."
            : "Here's your 30-day roadmap, built around your target role.";
          renderRoadmap(buildDemoRoadmap(targetRole, goal));
        })
        .finally(function () {
          setLoading(roadmapBtn, false);
          chatPanel.hidden = false;
          chatPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    });
  }
  const authButton = document.getElementById("authButton");

if (authButton) {

    onAuthStateChanged(auth, async (user) => {

        if (user) {
          const heroRef = doc(db, "users", user.uid);

try {
    const heroSnap = await getDoc(heroRef);

    if (heroSnap.exists() && heroSnap.data().hero) {
        const hero = heroSnap.data().hero;

        showHeroDashboard(
            hero.confidence,
            hero.signals,
            hero.recommendations
        );

    } else {
        showHeroDefault();
    }

} catch (e) {

    console.error("Hero load failed:", e);
    showHeroDefault();

}

            authButton.textContent = "Logout";
            authButton.href = "#";
            authButton.onclick = async (e) => {

                e.preventDefault();
                await signOut(auth);
                window.location.href = "/login";

            };

        } else {

            authButton.textContent = "Login";
            showHeroDefault();
            authButton.href = "/login";
            authButton.onclick = null;

        }

    });

}
})();
const aiOverlay=document.getElementById("aiOverlay");
const aiFill=document.getElementById("aiProgressFill");
const aiPercent=document.getElementById("aiPercent");
const steps=[
document.getElementById("step1"),
document.getElementById("step2"),
document.getElementById("step3"),
document.getElementById("step4"),
document.getElementById("step5")
];
let progressTimer;
function startAIProgress(){
aiOverlay.classList.remove("hidden");
let progress=0;
progressTimer=setInterval(()=>{
if(progress>=95)return;
progress+=Math.floor(Math.random()*4)+2;
if(progress>95)progress=95;
aiFill.style.width=progress+"%";
aiPercent.textContent=progress+"%";
const completed=Math.floor(progress/20);
steps.forEach((s,i)=>{
if(i<completed){
s.innerHTML="✅ "+s.textContent.replace("⏳ ","");
}
});
},180);
}
function finishAIProgress(callback){

    clearInterval(progressTimer);

    aiFill.style.width="100%";
    aiPercent.textContent="100%";

    steps.forEach(step=>{

        step.innerHTML="✅ "+step.textContent.replace("⏳ ","");

    });

    setTimeout(()=>{

        aiOverlay.classList.add("hidden");

        if(callback){
            callback();
        }

    },700);

}
/* ==========================================================
   Smart Hero State Manager
========================================================== */

const heroDefaultState = document.getElementById("heroDefaultState");
const heroDashboardState = document.getElementById("heroDashboardState");

function showHeroDefault() {
    if (!heroDefaultState || !heroDashboardState) return;
    heroDefaultState.classList.remove("hidden");
    heroDashboardState.classList.add("hidden");
}

function showHeroDashboard(confidence, signals, recommendations) {
    if (!heroDefaultState || !heroDashboardState) return;
    heroDefaultState.classList.add("hidden");
    heroDashboardState.classList.remove("hidden");

    animateHeroValue(
        document.getElementById("heroConfidence"),
        confidence,
        "%"
    );
    animateHeroValue(
        document.getElementById("heroSignals"),
        signals,
        ""
    );
    animateHeroValue(
        document.getElementById("heroRecommendations"),
        recommendations,
        ""
    );
}
function animateHeroValue(element, target, suffix=""){
    let value = 0;
    const timer = setInterval(()=>{
        value++;
        element.textContent = value + suffix;
        if(value>=target){
            clearInterval(timer);
        }
    },15);
}
window.addEventListener("DOMContentLoaded", () => {
    showHeroDefault();
});