/* ============================================================
   RESUME ANALYZER MODULE — resume_section.js
   ============================================================
   Fully self-contained. Only touches elements with "resume"-
   prefixed ids, so it cannot collide with any existing IDs or
   event listeners in your project. Wrapped in its own IIFE.
   ============================================================ */

(function () {
  "use strict";

  var MAX_FILE_MB = 10;
  var ENDPOINT = "/analyze-resume";

  var dropzone = document.getElementById("resumeDropzone");
  var fileInput = document.getElementById("resumeFileInput");
  var chooseBtn = document.getElementById("resumeChooseBtn");
  var fileInfo = document.getElementById("resumeFileInfo");
  var fileNameEl = document.getElementById("resumeFileName");
  var fileSizeEl = document.getElementById("resumeFileSize");
  var removeFileBtn = document.getElementById("resumeRemoveFile");
  var errorBanner = document.getElementById("resumeErrorBanner");
  var progressWrap = document.getElementById("resumeProgressWrap");
  var progressFill = document.getElementById("resumeProgressFill");
  var progressPercent = document.getElementById("resumeProgressPercent");
  var processingEl = document.getElementById("resumeProcessing");
  var processingText = document.getElementById("resumeProcessingText");
  var analyzeBtn = document.getElementById("resumeAnalyzeBtn");
  var resultsSection = document.getElementById("resumeResults");

  if (!dropzone || !analyzeBtn) return; // module not present on this page

  var selectedFile = null;

  /* ---------------------------------------------------------
     Scroll reveal (scoped to this module only)
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".resume-reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("resume-in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("resume-in-view"); });
  }

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
  }
  function hideError() {
    errorBanner.hidden = true;
    errorBanner.textContent = "";
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function isPdf(file) {
    var typeOk = file.type === "application/pdf";
    var nameOk = /\.pdf$/i.test(file.name || "");
    return typeOk || nameOk;
  }

  function setLoading(btn, isLoading) {
    btn.classList.toggle("is-loading", isLoading);
    btn.disabled = isLoading;
  }

  function resetUploadUI() {
    progressWrap.hidden = true;
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    processingEl.hidden = true;
  }

  /* ---------------------------------------------------------
     File selection (click + drag & drop)
  --------------------------------------------------------- */
  function handleFile(file) {
    hideError();
    if (!file) return;

    if (!isPdf(file)) {
      showError("Please upload a PDF file. Other formats aren't supported yet.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showError("That file is larger than " + MAX_FILE_MB + "MB. Please upload a smaller PDF.");
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatSize(file.size);
    fileInfo.hidden = false;
    analyzeBtn.disabled = false;
  }

  chooseBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener("click", function () {
    fileInput.click();
  });
  dropzone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("resume-dragover");
    });
  });
  ["dragleave", "dragend", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("resume-dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files[0]) handleFile(files[0]);
  });

  removeFileBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = "";
    fileInfo.hidden = true;
    analyzeBtn.disabled = true;
    hideError();
    resultsSection.hidden = true;
  });

  /* ---------------------------------------------------------
     Response parsing — "analysis" is a single block of text
     (e.g. raw Gemini output), so we parse it heuristically
     into the sections the UI displays.
  --------------------------------------------------------- */
  var SECTION_KEYWORDS = {
    strengths: ["strengths", "strong points", "what's working"],
    weaknesses: ["weaknesses", "weak areas", "areas to improve", "improvements"],
    missingSkills: ["missing skills", "skill gaps", "skills missing", "missing keywords"],
    projectsReview: ["projects review", "project review", "projects"],
    formatting: ["resume formatting", "formatting", "structure & layout", "structure and layout", "layout"],
    interviewReadiness: ["interview readiness", "interview prep", "interview preparedness"],
    finalSuggestions: ["final suggestions", "suggestions", "recommendations", "final thoughts", "summary"],
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // very small markdown-lite: **bold**, *italic*/_italic_, newlines -> <br>
  function mdLite(str) {
    var escaped = escapeHtml(str);
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/(^|[\s])\*(?!\s)(.+?)(?!\s)\*(?=[\s.,!?]|$)/g, "$1<em>$2</em>");
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function stripHeadingMarkup(line) {
    return line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .replace(/^[-*•]\s*/, "")
      .replace(/:\s*$/, "")
      .trim();
  }

  function matchSectionKey(line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.length > 70) return null;
    var normalized = stripHeadingMarkup(trimmed).toLowerCase();
    for (var key in SECTION_KEYWORDS) {
      var phrases = SECTION_KEYWORDS[key];
      for (var i = 0; i < phrases.length; i++) {
        if (normalized === phrases[i] || normalized.indexOf(phrases[i]) === 0) {
          return key;
        }
      }
    }
    return null;
  }

  function extractListItems(block) {
    var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var bulletLines = lines.filter(function (l) { return /^([-*•]|\d+[.)])\s+/.test(l); });
    var source = bulletLines.length ? bulletLines : lines;
    var items = source
      .map(function (l) { return l.replace(/^([-*•]|\d+[.)])\s+/, "").trim(); })
      .filter(Boolean);
    if (items.length <= 1 && block.indexOf(",") > -1 && !bulletLines.length) {
      items = block.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return items;
  }

  function parseAnalysis(text) {
    var result = {
      atsScore: null,
      strengths: [],
      weaknesses: [],
      missingSkills: [],
      projectsReview: "",
      formatting: "",
      interviewReadiness: "",
      finalSuggestions: [],
      raw: text,
      parsedAny: false,
    };

    if (!text || typeof text !== "string") return result;

    // ATS score: look anywhere in the text
    var atsMatch = text.match(/ATS[^\d]{0,25}(\d{1,3})\s*(?:\/\s*100|%)?/i);
    if (atsMatch) {
      var score = parseInt(atsMatch[1], 10);
      if (!isNaN(score)) result.atsScore = Math.max(0, Math.min(100, score));
    }

    // Split into sections by heading-like lines
    var lines = text.split("\n");
    var buckets = {};
    var currentKey = null;

    lines.forEach(function (line) {
      var key = matchSectionKey(line);
      if (key) {
        currentKey = key;
        if (!buckets[key]) buckets[key] = [];
        return;
      }
      if (currentKey) {
        buckets[currentKey].push(line);
      }
    });

    Object.keys(buckets).forEach(function (key) {
      buckets[key] = buckets[key].join("\n").trim();
    });

    if (buckets.strengths) result.strengths = extractListItems(buckets.strengths);
    if (buckets.weaknesses) result.weaknesses = extractListItems(buckets.weaknesses);
    if (buckets.missingSkills) result.missingSkills = extractListItems(buckets.missingSkills);
    if (buckets.finalSuggestions) result.finalSuggestions = extractListItems(buckets.finalSuggestions);
    if (buckets.projectsReview) result.projectsReview = buckets.projectsReview;
    if (buckets.formatting) result.formatting = buckets.formatting;
    if (buckets.interviewReadiness) result.interviewReadiness = buckets.interviewReadiness;

    result.parsedAny = !!(
      result.atsScore !== null ||
      result.strengths.length ||
      result.weaknesses.length ||
      result.missingSkills.length ||
      result.projectsReview ||
      result.formatting ||
      result.interviewReadiness ||
      result.finalSuggestions.length
    );

    return result;
  }

  /* ---------------------------------------------------------
     Render results
  --------------------------------------------------------- */
  function scoreBadgeClass(score) {
    if (score >= 80) return ["score-strong", "Strong ATS compatibility"];
    if (score >= 60) return ["score-good", "Good ATS compatibility"];
    if (score >= 40) return ["score-fair", "Needs improvement"];
    return ["score-weak", "Likely to be filtered out"];
  }

  function animateNumber(el, from, to, duration) {
    var start = performance.now();
    function tick(now) {
      var progress = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function fillTagList(container, items, prefix) {
    container.innerHTML = "";
    items.forEach(function (item) {
      var span = document.createElement("span");
      span.textContent = prefix + " " + item;
      container.appendChild(span);
    });
  }

  function fillParagraph(container, text) {
    var paragraphs = text.split(/\n{2,}/).filter(Boolean);
    if (!paragraphs.length) paragraphs = [text];
    container.innerHTML = paragraphs.map(function (p) { return "<p>" + mdLite(p.trim()) + "</p>"; }).join("");
  }

  function renderResults(analysisText) {
    var parsed = parseAnalysis(analysisText);

    var atsCard = document.getElementById("resumeAtsCard");
    var atsScore = parsed.atsScore !== null ? parsed.atsScore : 0;

    if (parsed.atsScore !== null) {
      atsCard.hidden = false;
      var circle = document.getElementById("resumeAtsCircle");
      var circumference = 2 * Math.PI * 58;
      var offset = circumference - (atsScore / 100) * circumference;
      var valueEl = document.getElementById("resumeAtsValue");
      valueEl.textContent = "0";
      requestAnimationFrame(function () {
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        animateNumber(valueEl, 0, atsScore, 1000);
      });
      var badge = document.getElementById("resumeAtsBadge");
      var badgeText = document.getElementById("resumeAtsBadgeText");
      var classAndLabel = scoreBadgeClass(atsScore);
      badge.className = "resume-score-badge " + classAndLabel[0];
      badgeText.textContent = classAndLabel[1];
    } else {
      atsCard.hidden = true;
    }

    toggleCard("resumeStrengthsCard", parsed.strengths.length, function () {
      fillTagList(document.getElementById("resumeStrengths"), parsed.strengths, "✓");
    });
    toggleCard("resumeWeaknessesCard", parsed.weaknesses.length, function () {
      fillTagList(document.getElementById("resumeWeaknesses"), parsed.weaknesses, "⚠");
    });
    toggleCard("resumeMissingSkillsCard", parsed.missingSkills.length, function () {
      fillTagList(document.getElementById("resumeMissingSkills"), parsed.missingSkills, "+");
    });
    toggleCard("resumeProjectsReviewCard", parsed.projectsReview, function () {
      fillParagraph(document.getElementById("resumeProjectsReview"), parsed.projectsReview);
    });
    toggleCard("resumeFormattingCard", parsed.formatting, function () {
      fillParagraph(document.getElementById("resumeFormatting"), parsed.formatting);
    });
    toggleCard("resumeInterviewReadinessCard", parsed.interviewReadiness, function () {
      fillParagraph(document.getElementById("resumeInterviewReadiness"), parsed.interviewReadiness);
    });
    toggleCard("resumeFinalSuggestionsCard", parsed.finalSuggestions.length, function () {
      var list = document.getElementById("resumeFinalSuggestions");
      list.innerHTML = "";
      parsed.finalSuggestions.forEach(function (s) {
        var li = document.createElement("li");
        li.innerHTML = mdLite(s);
        list.appendChild(li);
      });
    });

    var rawCard = document.getElementById("resumeRawCard");
    if (!parsed.parsedAny) {
      rawCard.hidden = false;
      fillParagraph(document.getElementById("resumeRawAnalysis"), parsed.raw || "");
    } else {
      rawCard.hidden = true;
    }

    resultsSection.hidden = false;
    resultsSection.querySelectorAll(".resume-reveal").forEach(function (el) {
      el.classList.add("resume-in-view");
    });
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleCard(cardId, hasContent, fillFn) {
    var card = document.getElementById(cardId);
    if (hasContent) {
      card.hidden = false;
      fillFn();
    } else {
      card.hidden = true;
    }
  }

  /* ---------------------------------------------------------
     Upload + analyze (XHR for real upload progress)
  --------------------------------------------------------- */
  function analyzeResume() {
    if (!selectedFile) {
      showError("Please choose a PDF resume first.");
      return;
    }

    hideError();
    resultsSection.hidden = true;
    setLoading(analyzeBtn, true);
    progressWrap.hidden = false;
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    processingEl.hidden = true;

    var formData = new FormData();
    formData.append("resume", selectedFile);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT, true);

    xhr.upload.onprogress = function (e) {
      if (!e.lengthComputable) return;
      var pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = pct + "%";
      progressPercent.textContent = pct + "%";
    };

    xhr.upload.onload = function () {
      progressWrap.hidden = true;
      processingEl.hidden = false;
      processingText.textContent = "Analyzing your resume with AI\u2026";
    };

    xhr.onload = function () {
      setLoading(analyzeBtn, false);
      resetUploadUI();

      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (err) {
        showError("The server sent back something unexpected. Please try again.");
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        showError((data && data.error) || "Analysis failed (status " + xhr.status + "). Please try again.");
        return;
      }

      if (!data || typeof data.analysis !== "string") {
        showError("The analysis response was missing. Please try again.");
        return;
      }

      renderResults(data.analysis);
    };

    xhr.onerror = function () {
      setLoading(analyzeBtn, false);
      resetUploadUI();
      showError("Couldn't reach the analyzer. Check your connection and try again.");
    };

    xhr.send(formData);
  }

  analyzeBtn.addEventListener("click", analyzeResume);
})();
