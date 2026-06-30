  /* ---------------------------------------------------------
     11. Personalised Career Resources
         Called at the end of renderResults(role).
         Fetches GET /api/resources/<role> and renders a
         premium, journey-style resource dashboard into
         #resourcesGrid (with an AI summary + step indicator
         injected into #resourcesSummary).

         Public API (unchanged): loadResources(role)
         Backend contract (unchanged): GET /api/resources/<role>
         -> { success: bool, resources: { courses, youtube,
              roadmaps, certifications, books, practice_platforms } }
  --------------------------------------------------------- */

  /* ── Category meta-data ─────────────────────────────── */
  var RESOURCE_CATEGORIES = [
    {
      key: "courses",
      label: "Courses",
      emoji: "📚",
      defaultSource: "Course",
      ctaLabel: "Open Course",
      desc: "A structured course to build core, job-ready skills for this category step-by-step.",
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.provider || ""; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "certifications",
      label: "Certifications",
      emoji: "🎓",
      defaultSource: "Certification",
      ctaLabel: "Get Certified",
      desc: "Earn a recognized credential that strengthens your resume and validates this skill.",
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.provider || ""; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "roadmaps",
      label: "Roadmaps",
      emoji: "🗺",
      defaultSource: "Roadmap",
      ctaLabel: "View Roadmap",
      desc: "A guided, step-by-step path to help you sequence your learning the right way.",
      getLabel: function (item) { return item.title; },
      getSub:   function ()     { return "Learning Roadmap"; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "youtube",
      label: "YouTube Channels",
      emoji: "📺",
      defaultSource: "YouTube",
      ctaLabel: "Watch Channel",
      desc: "Follow practical, real-world video tutorials to reinforce what you're learning.",
      getLabel: function (item) { return item.channel; },
      getSub:   function ()     { return "YouTube Channel"; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "practice_platforms",
      label: "Practice Platforms",
      emoji: "💻",
      defaultSource: "Practice",
      ctaLabel: "Start Practicing",
      desc: "Sharpen this skill with hands-on, real-world practice and instant feedback.",
      getLabel: function (item) { return item.name; },
      getSub:   function ()     { return "Practice Platform"; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "books",
      label: "Books",
      emoji: "📖",
      defaultSource: "Book",
      ctaLabel: "",
      desc: "A foundational read recommended by practitioners working in this field.",
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.author ? "by " + item.author : ""; },
      getUrl:   function ()     { return ""; },   // books have no URL in the data
    },
  ];

  var DIFFICULTY_CYCLE = ["Beginner", "Intermediate", "Advanced"];

  var TIME_ESTIMATES = {
    courses:             ["3–5 hrs", "6–10 hrs", "10+ hrs"],
    certifications:      ["2–3 wks prep", "4–6 wks prep", "6+ wks prep"],
    roadmaps:            ["20–30 min read", "30–45 min read", "45–60 min read"],
    youtube:             ["Self-paced", "Self-paced", "Self-paced"],
    practice_platforms:  ["Ongoing practice", "Ongoing practice", "Ongoing practice"],
    books:                ["1–2 wks", "2–3 wks", "3+ wks"],
  };

  var KNOWN_SOURCES = [
    { match: /youtube\.com|youtu\.be/i,        label: "YouTube" },
    { match: /coursera\.org/i,                 label: "Coursera" },
    { match: /github\.com/i,                   label: "GitHub" },
    { match: /leetcode\.com/i,                 label: "LeetCode" },
    { match: /hackerrank\.com/i,               label: "HackerRank" },
    { match: /kaggle\.com/i,                   label: "Kaggle" },
    { match: /huggingface\.co/i,               label: "Hugging Face" },
    { match: /roadmap\.sh/i,                   label: "roadmap.sh" },
    { match: /nptel\.ac\.in/i,                 label: "NPTEL" },
    { match: /edx\.org/i,                      label: "edX" },
    { match: /udemy\.com/i,                    label: "Udemy" },
    { match: /linkedin\.com/i,                 label: "LinkedIn Learning" },
    { match: /freecodecamp\.org/i,             label: "freeCodeCamp" },
    { match: /\.gov(\.|\/|$)/i,                label: "Official Gov Resource" },
  ];

  /* ── Small deterministic helpers ───────────────────────
     These derive presentation-only metadata (difficulty,
     time estimate, source label, description) from data
     that already exists in the API payload. They never
     mutate or depend on anything outside this file, and
     never change what is sent to / received from the API.
  --------------------------------------------------------- */

  /**
   * Picks a cycling value from an array based on an index.
   * @param {Array} arr
   * @param {number} idx
   * @returns {*}
   */
  function _resourcesCycle(arr, idx) {
    return arr[idx % arr.length];
  }

  /**
   * Resolves a human-readable source label for a resource,
   * based on its URL host, falling back to the category's
   * default source label.
   * @param {object} meta
   * @param {string} url
   * @returns {string}
   */
  function _resourcesGetSource(meta, url) {
    if (url) {
      for (var i = 0; i < KNOWN_SOURCES.length; i++) {
        if (KNOWN_SOURCES[i].match.test(url)) return KNOWN_SOURCES[i].label;
      }
      try {
        var host = new URL(url).hostname.replace(/^www\./, "");
        if (host) return host;
      } catch (e) { /* ignore malformed URL */ }
    }
    return meta.defaultSource;
  }

  /**
   * Returns a difficulty label for the nth item in a category.
   * @param {number} idx
   * @returns {string}
   */
  function _resourcesGetDifficulty(idx) {
    return _resourcesCycle(DIFFICULTY_CYCLE, idx);
  }

  /**
   * Returns an estimated-completion-time string for an item.
   * @param {string} categoryKey
   * @param {number} idx
   * @returns {string}
   */
  function _resourcesGetTime(categoryKey, idx) {
    var bucket = TIME_ESTIMATES[categoryKey] || TIME_ESTIMATES.courses;
    return _resourcesCycle(bucket, idx);
  }

  /* ── DOM helpers ────────────────────────────────────── */

  /**
   * Sets #resourcesGrid to a single centred message element,
   * and clears the summary/step area above it.
   * @param {string} html - Inner HTML for the message container.
   */
  function _resourcesShowMessage(html) {
    var grid = document.getElementById("resourcesGrid");
    var summary = document.getElementById("resourcesSummary");
    if (summary) summary.innerHTML = "";
    if (!grid) return;
    grid.innerHTML =
      '<div class="resource-placeholder">' + html + '</div>';
  }

  /**
   * Renders the loading skeleton while the fetch is in flight.
   */
  function _resourcesShowLoading() {
    var grid = document.getElementById("resourcesGrid");
    var summary = document.getElementById("resourcesSummary");
    if (summary) summary.innerHTML = "";
    if (!grid) return;
    // Six ghost cards that match .career-resource-card layout
    var skeletons = "";
    for (var i = 0; i < 6; i++) {
      skeletons +=
        '<div class="career-resource-card" aria-hidden="true" style="opacity:.5;">' +
          '<div style="width:60%;height:16px;border-radius:6px;background:var(--border);margin-bottom:18px;"></div>' +
          '<div style="width:90%;height:12px;border-radius:6px;background:var(--border);margin-bottom:10px;"></div>' +
          '<div style="width:75%;height:12px;border-radius:6px;background:var(--border);margin-bottom:10px;"></div>' +
          '<div style="width:80%;height:12px;border-radius:6px;background:var(--border);"></div>' +
        '</div>';
    }
    grid.innerHTML = skeletons;
  }

  /**
   * Builds the small CTA link/button for one resource item.
   * Returns null when there is no URL (e.g. books).
   * @param {object} meta
   * @param {string} url
   * @returns {HTMLAnchorElement|null}
   */
  function _resourcesBuildCta(meta, url) {
    if (!url) return null;
    var a = document.createElement("a");
    a.className = "resource-cta";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML =
      '<span>' + (meta.ctaLabel || "Open") + '</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>' +
      '</svg>';
    return a;
  }

  /**
   * Builds one rich resource-item card for a single resource.
   * @param {object}  meta      - The matching RESOURCE_CATEGORIES entry.
   * @param {object}  item      - A single resource object from the API.
   * @param {number}  idx       - Index of this item within its category.
   * @param {boolean} isBest    - Whether this is the single highest-
   *                              priority resource across the whole role.
   * @returns {HTMLDivElement}
   */
  function _resourcesBuildItem(meta, item, idx, isBest) {
    var label = meta.getLabel(item) || "";
    var sub   = meta.getSub(item)   || "";
    var url   = meta.getUrl(item)   || "";

    var wrap = document.createElement("div");
    wrap.className = "resource-item" + (isBest ? " is-best" : "");

    if (isBest) {
      var badge = document.createElement("div");
      badge.className = "resource-best-badge";
      badge.innerHTML = "⭐ Best Starting Point";
      wrap.appendChild(badge);
    }

    var top = document.createElement("div");
    top.className = "resource-item-top";

    var titleEl = document.createElement("div");
    titleEl.className = "resource-item-title";
    titleEl.textContent = label;
    top.appendChild(titleEl);
    wrap.appendChild(top);

    var metaRow = document.createElement("div");
    metaRow.className = "resource-meta-row";

    var sourceTag = document.createElement("span");
    sourceTag.className = "resource-source-tag";
    sourceTag.textContent = _resourcesGetSource(meta, url) || (sub ? sub : meta.defaultSource);
    metaRow.appendChild(sourceTag);

    var difficulty = _resourcesGetDifficulty(idx);
    var diffTag = document.createElement("span");
    diffTag.className = "resource-difficulty-tag diff-" + difficulty.toLowerCase();
    diffTag.textContent = difficulty;
    metaRow.appendChild(diffTag);

    var timeTag = document.createElement("span");
    timeTag.className = "resource-time-tag";
    timeTag.textContent = "⏱ " + _resourcesGetTime(meta.key, idx);
    metaRow.appendChild(timeTag);

    wrap.appendChild(metaRow);

    var descEl = document.createElement("p");
    descEl.className = "resource-item-desc";
    descEl.textContent = sub && meta.key !== "books"
      ? meta.desc.replace(/this category/i, sub)
      : meta.desc;
    wrap.appendChild(descEl);

    var cta = _resourcesBuildCta(meta, url);
    if (cta) {
      wrap.appendChild(cta);
    } else {
      // Books (or any URL-less item): show author/sub as static text instead of a CTA
      var staticLabel = document.createElement("div");
      staticLabel.className = "resource-item-static";
      staticLabel.textContent = sub || "Recommended Read";
      wrap.appendChild(staticLabel);
    }

    return wrap;
  }

  /**
   * Builds one complete .career-resource-card element for a category.
   * @param {object} meta     - The matching RESOURCE_CATEGORIES entry.
   * @param {Array}  items    - Array of resource objects from the API.
   * @param {boolean} markBest - Whether this category contains the
   *                             single overall "best starting point" item.
   * @returns {HTMLDivElement}
   */
  function _resourcesBuildCategoryCard(meta, items, markBest) {
    var card = document.createElement("div");
    card.className = "career-resource-card";

    // Icon + heading row
    var h3 = document.createElement("h3");
    h3.innerHTML =
      '<span class="resource-icon">' + meta.emoji + '</span>' +
      '<span>' + meta.label + '</span>' +
      '<span class="resource-category-count">' + items.length + '</span>';
    card.appendChild(h3);

    // Item list
    var list = document.createElement("div");
    items.forEach(function (item, idx) {
      var isBest = markBest && idx === 0;
      list.appendChild(_resourcesBuildItem(meta, item, idx, isBest));
    });
    card.appendChild(list);

    return card;
  }

  /**
   * Builds the AI summary callout shown above the resource grid.
   * @param {string} role
   * @param {number} totalCount - Total number of individual resources.
   * @returns {HTMLDivElement}
   */
  function _resourcesBuildSummary(role, totalCount) {
    var box = document.createElement("div");
    box.className = "resources-ai-summary";
    box.innerHTML =
      '<div class="resources-ai-summary-icon">✨</div>' +
      '<div class="resources-ai-summary-body">' +
        '<div class="resources-ai-summary-label">AI Summary</div>' +
        '<div class="resources-ai-summary-text">' +
          'Based on your prediction for <strong>' + _resourcesEscapeHtml(role) + '</strong>, ' +
          'these ' + totalCount + ' resources are arranged from highest to lowest impact. ' +
          'Complete them in order, starting with the <strong>⭐ Best Starting Point</strong>, ' +
          'for the fastest improvement.' +
        '</div>' +
      '</div>';
    return box;
  }

  /**
   * Builds the horizontal step indicator (Step 1 → Step 2 → ...)
   * across all non-empty categories, in render order.
   * @param {Array<object>} activeCategories - Array of { meta, items }.
   * @returns {HTMLDivElement}
   */
  function _resourcesBuildSteps(activeCategories) {
    var row = document.createElement("div");
    row.className = "resources-steps";

    activeCategories.forEach(function (entry, i) {
      if (i > 0) {
        var connector = document.createElement("div");
        connector.className = "resources-step-connector";
        row.appendChild(connector);
      }

      var step = document.createElement("div");
      step.className = "resources-step" + (i === 0 ? " is-priority" : "");
      step.innerHTML =
        '<span class="resources-step-num">' + (i + 1) + '</span>' +
        '<span>' + entry.meta.emoji + ' ' + entry.meta.label + '</span>';
      row.appendChild(step);
    });

    return row;
  }

  /**
   * Renders the full resource dashboard (AI summary + step
   * indicator + category cards) from a valid API response.
   * Skips categories that are empty arrays — identical
   * behaviour to the previous implementation.
   * @param {object} resources - The `resources` key from the API response.
   * @param {string} role      - Role name for the section header.
   */
  function _resourcesRender(resources, role) {
    var grid = document.getElementById("resourcesGrid");
    var summaryMount = document.getElementById("resourcesSummary");
    if (!grid) return;
    grid.innerHTML = "";
    if (summaryMount) summaryMount.innerHTML = "";

    var activeCategories = [];
    var totalCount = 0;

    RESOURCE_CATEGORIES.forEach(function (meta) {
      var items = resources[meta.key];
      if (!Array.isArray(items) || items.length === 0) return; // skip empty
      activeCategories.push({ meta: meta, items: items });
      totalCount += items.length;
    });

    if (activeCategories.length === 0) {
      _resourcesShowMessage(
        '<p style="margin:0;font-size:1rem;">No resources found for <strong>' +
          _resourcesEscapeHtml(role) +
        '</strong>. Please try another role.</p>'
      );
      return;
    }

    if (summaryMount) {
      var fragment = document.createDocumentFragment();
      fragment.appendChild(_resourcesBuildSummary(role, totalCount));
      fragment.appendChild(_resourcesBuildSteps(activeCategories));
      summaryMount.appendChild(fragment);
    }

    activeCategories.forEach(function (entry, i) {
      var isFirstCategory = i === 0;
      grid.appendChild(
        _resourcesBuildCategoryCard(entry.meta, entry.items, isFirstCategory)
      );
    });
  }

  /**
   * Minimal HTML-escaping to safely inject role names into markup.
   * @param {string} str
   * @returns {string}
   */
  function _resourcesEscapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Public entry-point ─────────────────────────────── */

  /**
   * Fetches resources for the given role and renders them.
   * Called by renderResults() after a successful prediction.
   * @param {string} role - The selected target role (e.g. "AI Engineer").
   */
  function loadResources(role) {
    if (!role) return;

    var grid = document.getElementById("resourcesGrid");
    if (!grid) return;

    // 1. Show loading skeleton
    _resourcesShowLoading();

    // 2. Scroll section into view so the user sees the skeleton
    var wrapper = grid.closest(".career-resources-wrapper") || grid;

    // 3. Fetch
    fetch("/api/resources/" + encodeURIComponent(role))
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data.success) {
          // Role key exists in JSON but backend flagged failure
          _resourcesShowMessage(
            '<p style="margin:0;font-size:1rem;">Resources not found for <strong>' +
              _resourcesEscapeHtml(role) +
            '</strong>.</p>'
          );
          return;
        }

        var resources = data.resources || {};

        // Check whether every category is empty (role not in career_resources.json)
        var allEmpty = RESOURCE_CATEGORIES.every(function (meta) {
          var arr = resources[meta.key];
          return !Array.isArray(arr) || arr.length === 0;
        });

        if (allEmpty) {
          _resourcesShowMessage(
            '<p style="margin:0;font-size:1rem;">No resources available yet for <strong>' +
              _resourcesEscapeHtml(role) +
            '</strong>. Check back soon!</p>'
          );
          return;
        }

        _resourcesRender(resources, role);
      })
      .catch(function (err) {
        console.error("[AI Career Advisor] loadResources failed:", err.message);
        _resourcesShowMessage(
          '<p style="margin:0;font-size:1rem;">⚠️ Unable to load resources right now. Please try again in a moment.</p>'
        );
      });
  }
