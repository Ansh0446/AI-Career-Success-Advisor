/* ============================================================================
   AVATAR PROFILE MENU — component behavior
   Namespace: window.ACAProfileMenu
   Self-contained. Does not read or modify any other script on the page.
   ============================================================================

   PUBLIC API (for wiring up Firebase auth later):

     ACAProfileMenu.setUser({ name, email, photoURL, plan })
         -> switches the component into the logged-in state.
         plan is optional, "free" (default) or "premium".

     ACAProfileMenu.setGuest()
         -> switches the component back into the guest state.

     ACAProfileMenu.configure({ loginUrl, aboutSelector })
         -> loginUrl: where the Login button navigates (default "/login").
         -> aboutSelector: element to scroll to for "About Project"
            (default "#about").

     ACAProfileMenu.on(eventName, callback)
         -> subscribe to component events. Events fired:
            "login"        - login button clicked (before navigation)
            "logout"       - logout button clicked
            "themechange"  - { value: "light"|"dark"|"system" }
            "languagechange" - { value: "en"|"hi" }
            "notificationchange" - { key, enabled }
            "feedback"     - { message }  (fired on submit)
            "action"       - { name: "saved-reports"|"go-premium"|"about" }

   Example (future Firebase hook, written elsewhere, not in this file):
     firebase.auth().onAuthStateChanged(user => {
       if (user) {
         ACAProfileMenu.setUser({
           name: user.displayName || "Member",
           email: user.email,
           photoURL: user.photoURL
         });
       } else {
         ACAProfileMenu.setGuest();
       }
     });
     ACAProfileMenu.on("logout", () => firebase.auth().signOut());
   ============================================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "apm:prefs";

  const els = {};
  let config = {
    loginUrl: "/login",
    aboutSelector: "#about"
  };
  let currentUser = null;
  let lastFocused = null;
  const listeners = {};

  function on(event, cb) {
    (listeners[event] = listeners[event] || []).push(cb);
    return () => {
      listeners[event] = listeners[event].filter((fn) => fn !== cb);
    };
  }
  function emit(event, detail) {
    (listeners[event] || []).forEach((fn) => {
      try { fn(detail); } catch (err) { console.error("[ACAProfileMenu]", err); }
    });
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }
  function savePrefs(patch) {
    const prefs = { ...loadPrefs(), ...patch };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
    return prefs;
  }

  function qs(id) { return document.getElementById(id); }

  function cacheEls() {
    els.root = qs("apmRoot");
    els.trigger = qs("apmTrigger");
    els.avatarSlot = qs("apmAvatarSlot");
    els.statusDot = qs("apmStatusDot");
    els.scrim = qs("apmScrim");
    els.panel = qs("apmPanel");
    els.panelInner = qs("apmPanelInner");
    els.headerAvatar = qs("apmHeaderAvatar");
    els.headerName = qs("apmHeaderName");
    els.headerEmail = qs("apmHeaderEmail");
    els.planBadge = qs("apmPlanBadge");
    els.loginBtn = qs("apmLoginBtn");
    els.logoutBtn = qs("apmLogoutBtn");
    els.feedbackOverlay = qs("apmFeedbackOverlay");
    els.feedbackText = qs("apmFeedbackText");
    els.feedbackCount = qs("apmFeedbackCount");
    els.feedbackSubmit = qs("apmFeedbackSubmit");
    els.feedbackCancel = qs("apmFeedbackCancel");
    els.feedbackClose = qs("apmFeedbackClose");
  }

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
  }

  function renderAvatarInto(container, user) {
    container.innerHTML = "";
    if (user && user.photoURL) {
      const img = document.createElement("img");
      img.src = user.photoURL;
      img.alt = "";
      container.appendChild(img);
    } else if (user) {
      container.textContent = initials(user.name);
    } else {
      container.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" class="apm-guest-icon">' +
        '<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M4.5 19.2c1.4-3.4 4.4-5.2 7.5-5.2s6.1 1.8 7.5 5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        "</svg>";
    }
  }

  function renderState() {
    if (currentUser) {
      els.root.dataset.state = "user";
      els.root.dataset.plan = currentUser.plan === "premium" ? "premium" : "free";
      renderAvatarInto(els.avatarSlot, currentUser);
      renderAvatarInto(els.headerAvatar, currentUser);
      els.headerName.textContent = currentUser.name || "Member";
      if (currentUser.email) {
        els.headerEmail.hidden = false;
        els.headerEmail.textContent = currentUser.email;
      } else {
        els.headerEmail.hidden = true;
      }
      els.planBadge.textContent = currentUser.plan === "premium" ? "Premium" : "Free Plan";
      els.loginBtn.hidden = true;
      els.logoutBtn.hidden = false;
    } else {
      els.root.dataset.state = els.root.dataset.state === "open" ? "open" : "guest";
      els.root.dataset.plan = "free";
      renderAvatarInto(els.avatarSlot, null);
      renderAvatarInto(els.headerAvatar, null);
      els.headerName.textContent = "Guest User";
      els.headerEmail.hidden = true;
      els.planBadge.textContent = "Free Plan";
      els.loginBtn.hidden = false;
      els.loginBtn.setAttribute("href", config.loginUrl);
      els.logoutBtn.hidden = true;
    }
  }

  /* ------------------------------ open / close ------------------------------ */

  function isOpen() {
    return els.root.dataset.state === "open" || els.root.classList.contains("is-open");
  }

  function openMenu() {
    lastFocused = document.activeElement;
    els.root.dataset.prevState = currentUser ? "user" : "guest";
    els.root.dataset.state = "open";
    els.trigger.setAttribute("aria-expanded", "true");
    els.panel.setAttribute("aria-hidden", "false");
    if (window.matchMedia("(max-width: 560px)").matches) {
      els.scrim.hidden = false;
    }
    document.addEventListener("keydown", onKeydown, true);
    document.addEventListener("click", onOutsideClick, true);
    // focus first interactive element for keyboard users
    requestAnimationFrame(() => {
      const first = els.panel.querySelector(".apm-item, .apm-auth-btn");
      first && first.focus({ preventScroll: true });
    });
  }

  function closeMenu() {
    els.root.dataset.state = currentUser ? "user" : "guest";
    els.trigger.setAttribute("aria-expanded", "false");
    els.panel.setAttribute("aria-hidden", "true");
    els.scrim.hidden = true;
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("click", onOutsideClick, true);
    goToView("main", { silent: true });
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  function toggleMenu() {
    isOpen() ? closeMenu() : openMenu();
  }

  function onOutsideClick(e) {
    if (!els.root.contains(e.target)) closeMenu();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeMenu();
    }
  }

  /* ------------------------------ view navigation ------------------------------ */

  function goToView(name, opts = {}) {
    const views = els.panel.querySelectorAll(".apm-view");
    views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === name));
    els.panel.dataset.activeView = name;
    if (!opts.silent) {
      requestAnimationFrame(() => {
        const active = els.panel.querySelector(`.apm-view[data-view="${name}"]`);
        const focusTarget = active && active.querySelector(".apm-back-btn, .apm-item, .apm-auth-btn");
        focusTarget && focusTarget.focus({ preventScroll: true });
      });
    }
  }

  /* ------------------------------ toast ------------------------------ */

  let toastEl = null;
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "apm-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  }

  /* ------------------------------ theme / language / notifications ------------------------------ */

  function applyTheme(value) {
    const root = document.documentElement;
    if (value === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", value);
    }
    savePrefs({ theme: value });
    markSelected("appearance", "data-theme-option", value);
    emit("themechange", { value });
  }

  function applyLanguage(value) {
    savePrefs({ language: value });
    markSelected("language", "data-lang-option", value);
    emit("languagechange", { value });
  }

  function markSelected(viewName, attr, value) {
    const view = els.panel.querySelector(`.apm-view[data-view="${viewName}"]`);
    if (!view) return;
    view.querySelectorAll(".apm-option").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute(attr) === value);
    });
  }

  function initToggle(btn) {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("aria-checked") !== "true";
      btn.setAttribute("aria-checked", String(next));
      const key = btn.dataset.toggle;
      const prefs = loadPrefs();
      const notif = { ...(prefs.notifications || {}), [key]: next };
      savePrefs({ notifications: notif });
      emit("notificationchange", { key, enabled: next });
    });
  }

  /* ------------------------------ feedback modal ------------------------------ */

  function openFeedback() {
    els.feedbackOverlay.hidden = false;
    els.feedbackText.value = "";
    els.feedbackCount.textContent = "0";
    els.feedbackSubmit.disabled = true;
    document.addEventListener("keydown", onFeedbackKeydown, true);
    requestAnimationFrame(() => els.feedbackText.focus());
  }
  function closeFeedback() {
    els.feedbackOverlay.hidden = true;
    document.removeEventListener("keydown", onFeedbackKeydown, true);
  }
  function onFeedbackKeydown(e) {
    if (e.key === "Escape") closeFeedback();
  }

  /* ------------------------------ wiring ------------------------------ */

  function wireEvents() {
    els.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    els.panel.querySelectorAll("[data-submenu]").forEach((btn) => {
      btn.addEventListener("click", () => goToView(btn.dataset.submenu));
    });
    els.panel.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => goToView("main"));
    });

    els.panel.querySelectorAll("[data-theme-option]").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.themeOption));
    });
    els.panel.querySelectorAll("[data-lang-option]").forEach((btn) => {
      btn.addEventListener("click", () => applyLanguage(btn.dataset.langOption));
    });
    els.panel.querySelectorAll("[data-toggle]").forEach(initToggle);

    els.panel.querySelector('[data-action="saved-reports"]').addEventListener("click", () => {
      emit("action", { name: "saved-reports" });
      showToast("No saved reports yet");
      closeMenu();
    });
    els.panel.querySelector('[data-action="go-premium"]').addEventListener("click", () => {
      emit("action", { name: "go-premium" });
      showToast("Premium plans are coming soon");
      closeMenu();
    });
    els.panel.querySelector('[data-action="about"]').addEventListener("click", () => {
      emit("action", { name: "about" });
      closeMenu();
      const target = document.querySelector(config.aboutSelector);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.panel.querySelector('[data-action="feedback"]').addEventListener("click", () => {
      closeMenu();
      openFeedback();
    });

    els.loginBtn.addEventListener("click", () => emit("login"));
    els.logoutBtn.addEventListener("click", () => {
      closeMenu();
      emit("logout");
    });

    els.feedbackCancel.addEventListener("click", closeFeedback);
    els.feedbackClose.addEventListener("click", closeFeedback);
    els.feedbackOverlay.addEventListener("click", (e) => {
      if (e.target === els.feedbackOverlay) closeFeedback();
    });
    els.feedbackText.addEventListener("input", () => {
      const len = els.feedbackText.value.length;
      els.feedbackCount.textContent = String(len);
      els.feedbackSubmit.disabled = len === 0;
    });
    els.feedbackSubmit.addEventListener("click", () => {
      const message = els.feedbackText.value.trim();
      if (!message) return;
      emit("feedback", { message });
      closeFeedback();
      showToast("Thanks for the feedback!");
    });
  }

  function restorePrefs() {
    const prefs = loadPrefs();
    if (prefs.theme) markSelected("appearance", "data-theme-option", prefs.theme);
    else markSelected("appearance", "data-theme-option", document.documentElement.getAttribute("data-theme") || "dark");
    markSelected("language", "data-lang-option", prefs.language || "en");
    if (prefs.notifications) {
      Object.entries(prefs.notifications).forEach(([key, enabled]) => {
        const el = els.panel.querySelector(`[data-toggle="${key}"]`);
        if (el) el.setAttribute("aria-checked", String(!!enabled));
      });
    }
  }

  function init(options) {
    config = { ...config, ...(options || {}) };
    cacheEls();
    if (!els.root) return; // component not present in DOM yet
    wireEvents();
    restorePrefs();
    renderState();
  }

  window.ACAProfileMenu = {
    init,
    configure(options) { config = { ...config, ...(options || {}) }; renderState(); },
    setUser(user) { currentUser = user || null; renderState(); },
    setGuest() { currentUser = null; renderState(); },
    on
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})();
