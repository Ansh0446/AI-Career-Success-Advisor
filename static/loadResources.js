  /* ---------------------------------------------------------
     11. Personalised Career Resources
         Called at the end of renderResults(role).
         Fetches GET /api/resources/<role> and renders
         categorised resource cards into #resourcesGrid.
  --------------------------------------------------------- */

  /* ── Category meta-data ─────────────────────────────── */
  var RESOURCE_CATEGORIES = [
    {
      key: "courses",
      label: "Courses",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.provider || ""; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "youtube",
      label: "YouTube Channels",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>',
      getLabel: function (item) { return item.channel; },
      getSub:   function ()     { return "YouTube Channel"; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "roadmaps",
      label: "Roadmaps",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
      getLabel: function (item) { return item.title; },
      getSub:   function ()     { return "Learning Roadmap"; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "certifications",
      label: "Certifications",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.provider || ""; },
      getUrl:   function (item) { return item.url || ""; },
    },
    {
      key: "books",
      label: "Books",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      getLabel: function (item) { return item.title; },
      getSub:   function (item) { return item.author ? "by " + item.author : ""; },
      getUrl:   function ()     { return ""; },   // books have no URL in the data
    },
    {
      key: "practice_platforms",
      label: "Practice Platforms",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      getLabel: function (item) { return item.name; },
      getSub:   function ()     { return "Practice Platform"; },
      getUrl:   function (item) { return item.url || ""; },
    },
  ];

  /* ── DOM helpers ────────────────────────────────────── */

  /**
   * Sets #resourcesGrid to a single centred message element.
   * @param {string} html - Inner HTML for the message container.
   */
  function _resourcesShowMessage(html) {
    var grid = document.getElementById("resourcesGrid");
    if (!grid) return;
    grid.innerHTML =
      '<div class="resource-placeholder">' + html + '</div>';
  }

  /**
   * Renders the loading skeleton while the fetch is in flight.
   */
  function _resourcesShowLoading() {
    var grid = document.getElementById("resourcesGrid");
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
   * Creates one external anchor element.
   * Returns null when url is empty (e.g. books).
   * @param {string} label - Link text.
   * @param {string} url   - Destination URL.
   * @returns {HTMLAnchorElement|null}
   */
  function _resourcesCreateLink(label, url) {
    if (!url) return null;
    var a = document.createElement("a");
    a.href = url;
    a.textContent = label;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  /**
   * Builds one <li> row for a resource item.
   * @param {object} meta - The matching entry from RESOURCE_CATEGORIES.
   * @param {object} item - A single resource object from the API payload.
   * @returns {HTMLLIElement}
   */
  function _resourcesBuildListItem(meta, item) {
    var li   = document.createElement("li");
    var label = meta.getLabel(item) || "";
    var sub   = meta.getSub(item)   || "";
    var url   = meta.getUrl(item)   || "";

    var link = _resourcesCreateLink(label, url);
    if (link) {
      li.appendChild(link);
    } else {
      // No URL — render plain text (e.g. books)
      var span = document.createElement("span");
      span.style.fontWeight = "600";
      span.textContent = label;
      li.appendChild(span);
    }

    if (sub) {
      var small = document.createElement("small");
      small.textContent = sub;
      li.appendChild(small);
    }

    return li;
  }

  /**
   * Builds one complete .career-resource-card element for a category.
   * @param {object} meta  - The matching RESOURCE_CATEGORIES entry.
   * @param {Array}  items - Array of resource objects from the API.
   * @returns {HTMLDivElement}
   */
  function _resourcesBuildCategoryCard(meta, items) {
    var card = document.createElement("div");
    card.className = "career-resource-card";

    // Icon + heading row
    var h3 = document.createElement("h3");
    h3.innerHTML =
      '<span class="resource-icon" style="display:inline-flex;margin-right:10px;vertical-align:middle;">' +
        meta.icon +
      '</span>' +
      meta.label;
    card.appendChild(h3);

    // Item list
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      ul.appendChild(_resourcesBuildListItem(meta, item));
    });
    card.appendChild(ul);

    return card;
  }

  /**
   * Renders the full resource grid from a valid API response.
   * Skips categories that are empty arrays.
   * @param {object} resources - The `resources` key from the API response.
   * @param {string} role      - Role name for the section header.
   */
  function _resourcesRender(resources, role) {
    var grid = document.getElementById("resourcesGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var hasContent = false;

    RESOURCE_CATEGORIES.forEach(function (meta) {
      var items = resources[meta.key];
      if (!Array.isArray(items) || items.length === 0) return; // skip empty
      hasContent = true;
      grid.appendChild(_resourcesBuildCategoryCard(meta, items));
    });

    if (!hasContent) {
      _resourcesShowMessage(
        '<p style="margin:0;font-size:1rem;">No resources found for <strong>' +
          _resourcesEscapeHtml(role) +
        '</strong>. Please try another role.</p>'
      );
    }
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
