/* =========================================================
   AI Career Success Advisor — Signup Page Logic
   Frontend-only. No backend, Flask, or Firebase calls here.
   handleSignup / handleGoogleSignup are PLACEHOLDERS — wire
   your real account-creation logic into them later.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------- Password visibility toggle ---------------- */
  function initPasswordToggles() {
    qsa(".signup-password-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (!input) return;

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";

        const eyeOpen = qs(".signup-icon-eye-open", btn);
        const eyeClosed = qs(".signup-icon-eye-closed", btn);
        if (eyeOpen) eyeOpen.hidden = !isVisible;
        if (eyeClosed) eyeClosed.hidden = isVisible;

        btn.setAttribute("aria-pressed", String(!isVisible));
        btn.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
      });
    });
  }

  /* ---------------- Field validation helpers ---------------- */
  function setFieldError(input, errorEl, message) {
    const wrap = input.closest(".signup-input-wrap");
    if (wrap) wrap.classList.add("signup-input--error");
    if (errorEl) errorEl.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(input, errorEl) {
    const wrap = input.closest(".signup-input-wrap");
    if (wrap) wrap.classList.remove("signup-input--error");
    if (errorEl) errorEl.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function showMessage(el, type, text) {
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.classList.remove("signup-message--error", "signup-message--success");
    el.classList.add(type === "success" ? "signup-message--success" : "signup-message--error");
  }

  function clearMessage(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("signup-message--error", "signup-message--success");
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.classList.toggle("is-loading", isLoading);
    btn.disabled = isLoading;
  }

  function shakeCard() {
    const card = qs(".signup-card");
    if (!card) return;
    card.classList.remove("signup-shake");
    requestAnimationFrame(() => card.classList.add("signup-shake"));
  }

  /* ---------------- Password strength meter ---------------- */
  function computeStrength(value) {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }

  function initStrengthMeter() {
    const passwordInput = qs("#signupPassword");
    const bars = qsa("#signupStrength .signup-strength-bar");
    const label = qs("#signupStrengthLabel");
    if (!passwordInput || !bars.length) return;

    const levels = ["", "is-weak", "is-fair", "is-good", "is-strong"];
    const labels = ["Password strength", "Weak", "Fair", "Good", "Strong"];

    passwordInput.addEventListener("input", () => {
      const score = computeStrength(passwordInput.value);
      bars.forEach((bar, i) => {
        bar.className = "signup-strength-bar";
        if (i < score) bar.classList.add(levels[score]);
      });
      if (label) label.textContent = labels[score];
    });
  }

  /* ---------------- Signup form ---------------- */
  function initSignupForm() {
    const form = qs("#signupForm");
    if (!form) return;

    const name = qs("#signupName");
    const nameError = qs("#signupNameError");
    const email = qs("#signupEmail");
    const emailError = qs("#signupEmailError");
    const password = qs("#signupPassword");
    const passwordError = qs("#signupPasswordError");
    const confirm = qs("#signupConfirm");
    const confirmError = qs("#signupConfirmError");
    const message = qs("#signupMessage");
    const submitBtn = qs("#signupSubmitBtn");

    const errorMap = {
      [name.id]: nameError,
      [email.id]: emailError,
      [password.id]: passwordError,
      [confirm.id]: confirmError,
    };

    [name, email, password, confirm].forEach((input) => {
      input.addEventListener("input", () => {
        clearFieldError(input, errorMap[input.id]);
        clearMessage(message);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearMessage(message);
      let valid = true;

      if (!name.value.trim() || name.value.trim().length < 2) {
        setFieldError(name, nameError, "Enter your full name.");
        valid = false;
      } else {
        clearFieldError(name, nameError);
      }

      if (!email.value.trim()) {
        setFieldError(email, emailError, "Email is required.");
        valid = false;
      } else if (!EMAIL_RE.test(email.value.trim())) {
        setFieldError(email, emailError, "Enter a valid email address.");
        valid = false;
      } else {
        clearFieldError(email, emailError);
      }

      if (!password.value || password.value.length < 8) {
        setFieldError(password, passwordError, "Password must be at least 8 characters.");
        valid = false;
      } else {
        clearFieldError(password, passwordError);
      }

      if (!confirm.value || confirm.value !== password.value) {
        setFieldError(confirm, confirmError, "Passwords do not match.");
        valid = false;
      } else {
        clearFieldError(confirm, confirmError);
      }

      if (!valid) {
        shakeCard();
        return;
      }

      setButtonLoading(submitBtn, true);

      handleSignup({
        fullName: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
      })
        .then(() => {
          setButtonLoading(submitBtn, false);
          showMessage(message, "success", "Account created successfully. Redirecting to sign in…");
        })
        .catch((err) => {
          setButtonLoading(submitBtn, false);
          shakeCard();
          showMessage(message, "error", (err && err.message) || "Unable to create your account. Please try again.");
        });
    });
  }

  /* ---------------- Google button ---------------- */
  function initGoogleButton() {
    const btn = qs("#signupGoogleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      setButtonLoading(btn, true);
      handleGoogleSignup()
        .then(() => {
          setButtonLoading(btn, false);
          showMessage(qs("#signupMessage"), "success", "Signed up with Google. Redirecting…");
        })
        .catch((err) => {
          setButtonLoading(btn, false);
          showMessage(qs("#signupMessage"), "error", (err && err.message) || "Google sign-up failed.");
        });
    });
  }

  /* =========================================================
     PLACEHOLDER AUTH FUNCTIONS
     Replace the bodies below with real calls to your Flask
     backend and/or Firebase Authentication. They currently
     simulate a network round-trip so the loading/disabled/
     success states above are fully demonstrable on their own.
     ========================================================= */

  function handleSignup(details) {
    // TODO: integrate real account creation (Flask route / Firebase)
    console.log("handleSignup placeholder called with:", details);
    return new Promise((resolve) => setTimeout(resolve, 1200));
  }

  function handleGoogleSignup() {
    // TODO: integrate real Google OAuth sign-up flow (Firebase / Flask)
    console.log("handleGoogleSignup placeholder called");
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initPasswordToggles();
    initStrengthMeter();
    initSignupForm();
    initGoogleButton();
  });
})();
