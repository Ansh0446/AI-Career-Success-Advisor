/* =========================================================
   AI Career Success Advisor — Login System Logic
   Frontend-only. No backend, Flask, or Firebase calls here.
   handleLogin / handleSignup / handleGoogleLogin /
   handleForgotPassword are PLACEHOLDERS — wire your real
   authentication logic into them later.
   ========================================================= */
import {
  auth,
  googleProvider
} from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

(function () {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let lastFocusedTrigger = null;
  let openOverlays = 0;

  /* ---------------- Password visibility toggle ---------------- */
  function initPasswordToggles() {
    qsa(".login-password-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (!input) return;

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";

        const eyeOpen = qs(".login-icon-eye-open", btn);
        const eyeClosed = qs(".login-icon-eye-closed", btn);
        if (eyeOpen) eyeOpen.hidden = !isVisible;
        if (eyeClosed) eyeClosed.hidden = isVisible;

        btn.setAttribute("aria-pressed", String(!isVisible));
        btn.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
      });
    });
  }

  /* ---------------- Modal system ---------------- */
  function getFocusable(container) {
    return qsa(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      container
    ).filter((el) => el.offsetParent !== null);
  }

  function trapTabKey(e, modal) {
    if (e.key !== "Tab") return;
    const focusable = getFocusable(modal);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(overlay, modal, triggerEl) {
    if (!overlay || !modal) return;

    lastFocusedTrigger = triggerEl || document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("login-no-scroll");
    openOverlays += 1;

    requestAnimationFrame(() => {
      overlay.classList.add("login-overlay--visible");
    });

    const firstField = getFocusable(modal)[0];
    setTimeout(() => firstField && firstField.focus(), 200);

    function onKeydown(e) {
      if (e.key === "Escape") {
        closeModal(overlay, modal);
      } else {
        trapTabKey(e, modal);
      }
    }

    overlay._onKeydown = onKeydown;
    document.addEventListener("keydown", onKeydown);

    function onOverlayClick(e) {
      if (e.target === overlay) closeModal(overlay, modal);
    }
    overlay._onOverlayClick = onOverlayClick;
    overlay.addEventListener("mousedown", onOverlayClick);
  }

  function closeModal(overlay, modal) {
    if (!overlay || !modal || overlay.hidden) return;

    overlay.classList.remove("login-overlay--visible");

    if (overlay._onKeydown) {
      document.removeEventListener("keydown", overlay._onKeydown);
      overlay._onKeydown = null;
    }
    if (overlay._onOverlayClick) {
      overlay.removeEventListener("mousedown", overlay._onOverlayClick);
      overlay._onOverlayClick = null;
    }

    setTimeout(() => {
      overlay.hidden = true;
      openOverlays = Math.max(0, openOverlays - 1);
      if (openOverlays === 0) {
        document.body.classList.remove("login-no-scroll");
      }
      if (lastFocusedTrigger) lastFocusedTrigger.focus();
    }, 250);
  }

  /* ---------------- Field validation helpers ---------------- */
  function setFieldError(input, errorEl, message) {
    const wrap = input.closest(".login-input-wrap");
    if (wrap) wrap.classList.add("login-input--error");
    if (errorEl) errorEl.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(input, errorEl) {
    const wrap = input.closest(".login-input-wrap");
    if (wrap) wrap.classList.remove("login-input--error");
    if (errorEl) errorEl.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function showMessage(el, type, text) {
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.classList.remove("login-message--error", "login-message--success");
    el.classList.add(type === "success" ? "login-message--success" : "login-message--error");
  }

  function clearMessage(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("login-message--error", "login-message--success");
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.classList.toggle("is-loading", isLoading);
    btn.disabled = isLoading;
  }

  function shakeCard() {
    const card = qs(".login-card");
    if (!card) return;
    card.classList.remove("login-shake");
    requestAnimationFrame(() => card.classList.add("login-shake"));
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
    const passwordInput = qs("#loginSignupPassword");
    const bars = qsa("#loginSignupStrength .login-strength-bar");
    const label = qs("#loginSignupStrengthLabel");
    if (!passwordInput || !bars.length) return;

    const levels = ["", "is-weak", "is-fair", "is-good", "is-strong"];
    const labels = ["Password strength", "Weak", "Fair", "Good", "Strong"];

    passwordInput.addEventListener("input", () => {
      const score = computeStrength(passwordInput.value);
      bars.forEach((bar, i) => {
        bar.className = "login-strength-bar";
        if (i < score) bar.classList.add(levels[score]);
      });
      if (label) label.textContent = labels[score];
    });
  }

  /* ---------------- Login form ---------------- */
  function initLoginForm() {
    const form = qs("#loginForm");
    if (!form) return;

    const email = qs("#loginEmail");
    const emailError = qs("#loginEmailError");
    const password = qs("#loginPassword");
    const passwordError = qs("#loginPasswordError");
    const message = qs("#loginMessage");
    const submitBtn = qs("#loginSubmitBtn");

    [email, password].forEach((input) => {
      input.addEventListener("input", () => {
        clearFieldError(input, input === email ? emailError : passwordError);
        clearMessage(message);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearMessage(message);

      let valid = true;

      if (!email.value.trim()) {
        setFieldError(email, emailError, "Email is required.");
        valid = false;
      } else if (!EMAIL_RE.test(email.value.trim())) {
        setFieldError(email, emailError, "Enter a valid email address.");
        valid = false;
      } else {
        clearFieldError(email, emailError);
      }

      if (!password.value) {
        setFieldError(password, passwordError, "Password is required.");
        valid = false;
      } else {
        clearFieldError(password, passwordError);
      }

      if (!valid) {
        shakeCard();
        return;
      }

      setButtonLoading(submitBtn, true);

      handleLogin({
        email: email.value.trim(),
        password: password.value,
        remember: qs("#loginRemember").checked,
      })
        .then(() => {
          setButtonLoading(submitBtn, false);
          showMessage(message, "success", "Signed in successfully. Redirecting…");
        })
        .catch((err) => {
          setButtonLoading(submitBtn, false);
          shakeCard();
          showMessage(message, "error", (err && err.message) || "Unable to sign in. Please try again.");
        });
    });
  }

  /* ---------------- Signup form ---------------- */
  function initSignupForm() {
    const form = qs("#loginSignupForm");
    if (!form) return;

    const name = qs("#loginSignupName");
    const nameError = qs("#loginSignupNameError");
    const email = qs("#loginSignupEmail");
    const emailError = qs("#loginSignupEmailError");
    const password = qs("#loginSignupPassword");
    const passwordError = qs("#loginSignupPasswordError");
    const confirm = qs("#loginSignupConfirm");
    const confirmError = qs("#loginSignupConfirmError");
    const message = qs("#loginSignupMessage");
    const submitBtn = qs("#loginSignupSubmitBtn");

    [name, email, password, confirm].forEach((input) => {
      const errorMap = {
        [name && name.id]: nameError,
        [email && email.id]: emailError,
        [password && password.id]: passwordError,
        [confirm && confirm.id]: confirmError,
      };
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
          showMessage(message, "success", "Account created. You can now sign in.");
        })
        .catch((err) => {
          setButtonLoading(submitBtn, false);
          showMessage(message, "error", (err && err.message) || "Unable to create your account.");
        });
    });
  }

  /* ---------------- Forgot password form ---------------- */
  function initForgotForm() {
    const form = qs("#loginForgotForm");
    if (!form) return;

    const email = qs("#loginForgotEmail");
    const emailError = qs("#loginForgotEmailError");
    const message = qs("#loginForgotMessage");
    const submitBtn = qs("#loginForgotSubmitBtn");

    email.addEventListener("input", () => {
      clearFieldError(email, emailError);
      clearMessage(message);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearMessage(message);

      if (!email.value.trim()) {
        setFieldError(email, emailError, "Email is required.");
        return;
      }
      if (!EMAIL_RE.test(email.value.trim())) {
        setFieldError(email, emailError, "Enter a valid email address.");
        return;
      }
      clearFieldError(email, emailError);

      setButtonLoading(submitBtn, true);

      handleForgotPassword(email.value.trim())
        .then(() => {
          setButtonLoading(submitBtn, false);
          showMessage(message, "success", "If an account exists for that email, a reset link is on its way.");
        })
        .catch((err) => {
          setButtonLoading(submitBtn, false);
          showMessage(message, "error", (err && err.message) || "Unable to send reset link.");
        });
    });
  }

  /* ---------------- Google button ---------------- */
  function initGoogleButton() {
    const btn = qs("#loginGoogleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      setButtonLoading(btn, true);
      handleGoogleLogin()
        .then(() => {
          setButtonLoading(btn, false);
          showMessage(qs("#loginMessage"), "success", "Signed in with Google. Redirecting…");
        })
        .catch((err) => {
          setButtonLoading(btn, false);
          showMessage(qs("#loginMessage"), "error", (err && err.message) || "Google sign-in failed.");
        });
    });
  }

  /* ---------------- Wire up modal triggers ---------------- */
  function initModalTriggers() {
    const signupOverlay = qs("#loginSignupOverlay");
    const signupModal = qs("#loginSignupModal");
    const forgotOverlay = qs("#loginForgotOverlay");
    const forgotModal = qs("#loginForgotModal");

    const signupTrigger = qs("#loginSignupTrigger");
    const signupClose = qs("#loginSignupClose");
    const signupBack = qs("#loginSignupBackTrigger");

    const forgotTrigger = qs("#loginForgotTrigger");
    const forgotClose = qs("#loginForgotClose");
    const forgotBack = qs("#loginForgotBackTrigger");

    if (signupTrigger) {
      signupTrigger.addEventListener("click", () => openModal(signupOverlay, signupModal, signupTrigger));
    }
    if (signupClose) signupClose.addEventListener("click", () => closeModal(signupOverlay, signupModal));
    if (signupBack) signupBack.addEventListener("click", () => closeModal(signupOverlay, signupModal));

    if (forgotTrigger) {
      forgotTrigger.addEventListener("click", () => openModal(forgotOverlay, forgotModal, forgotTrigger));
    }
    if (forgotClose) forgotClose.addEventListener("click", () => closeModal(forgotOverlay, forgotModal));
    if (forgotBack) forgotBack.addEventListener("click", () => closeModal(forgotOverlay, forgotModal));
  }

  /* =========================================================
     PLACEHOLDER AUTH FUNCTIONS
     Replace the bodies below with real calls to your Flask
     backend and/or Firebase Authentication. They currently
     simulate a network round-trip so the loading/disabled/
     success states above are fully demonstrable on their own.
     ========================================================= */

  async function handleLogin(credentials) {
  try {
    const userCredential = await signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
);

console.log(userCredential.user);

setTimeout(() => {
    window.location.href = "/";
}, 1000);

return Promise.resolve();

  } catch (error) {

    let message = "Unable to sign in.";

    switch (error.code) {

      case "auth/invalid-email":
        message = "Invalid email address.";
        break;

      case "auth/user-not-found":
        message = "No account found with this email.";
        break;

      case "auth/wrong-password":
        message = "Incorrect password.";
        break;

      case "auth/invalid-credential":
        message = "Incorrect email or password.";
        break;

      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later.";
        break;

      default:
        message = error.message;
    }

    throw new Error(message);
  }
}

  async function handleSignup(details) {

    try {

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            details.email,
            details.password
        );

        await updateProfile(userCredential.user, {
            displayName: details.fullName
        });

        return Promise.resolve();

    } catch (error) {

        console.log(error.code);
        console.log(error.message);

        let message = "Unable to create account.";

        switch (error.code) {

            case "auth/email-already-in-use":
                message = "Email already exists.";
                break;

            case "auth/invalid-email":
                message = "Invalid email address.";
                break;

            case "auth/weak-password":
                message = "Password should be at least 6 characters.";
                break;

            default:
                message = error.message;
        }

        throw new Error(message);
    }
}

  async function handleGoogleLogin() {

    try {

        await signInWithPopup(auth, googleProvider);

        setTimeout(() => {
            window.location.href = "/";
        }, 1000);

        return Promise.resolve();

    } catch (error) {

        console.log(error.code);
        console.log(error.message);

        throw new Error("Google sign-in failed.");
    }

}

  async function handleForgotPassword(email) {

    try {

        await sendPasswordResetEmail(auth, email);

        return Promise.resolve();

    } catch (error) {

        console.log(error.code);
        console.log(error.message);

        let message = "Unable to send reset email.";

        switch (error.code) {

            case "auth/user-not-found":
                message = "No account exists with this email.";
                break;

            case "auth/invalid-email":
                message = "Invalid email address.";
                break;

            default:
                message = error.message;

        }

        throw new Error(message);

    }

}

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initPasswordToggles();
    initStrengthMeter();
    initLoginForm();
    initSignupForm();
    initForgotForm();
    initGoogleButton();
    initModalTriggers();
  });
})();
