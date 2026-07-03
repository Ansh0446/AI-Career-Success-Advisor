/* ==========================================================================
   AI CAREER ADVISOR — CHATBOT WIDGET LOGIC
   Vanilla JS, no dependencies. Namespaced under `ACA`.

   INTEGRATION POINTS (replace stubs marked TODO with real calls):
     POST /chat            { message, attachments, history_id } -> streamed or JSON reply
     POST /upload-resume   FormData(file)                        -> { url, parsed }
     POST /generate-roadmap{ target_role }                       -> roadmap payload
     POST /predict         { profile }                           -> prediction payload
     GET  /history                                               -> [{id, title, group, pinned}]
     Firebase Auth / Firestore: read the current user + profile fields
       and call ACA.setContext({...}) to populate the context panel,
       and ACA.setMemoryChips([...]) to populate memory chips.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const els = {
    root: $("#acaRoot"),
    launcher: $("#acaLauncher"),
    badge: $("#acaBadge"),
    window: $("#acaWindow"),
    sidebar: $("#acaSidebar"),
    sidebarToggle: $("#acaHistoryToggle"),
    sidebarClose: $("#acaSidebarClose"),
    historyList: $("#acaHistoryList"),
    historySearch: $("#acaHistorySearch"),
    historyEmpty: $("#acaHistoryEmpty"),
    headerOrb: $("#acaHeaderOrb"),
    voiceStatus: $("#acaVoiceStatus"),
    clearChat: $("#acaClearChat"),
    settingsToggle: $("#acaSettingsToggle"),
    settings: $("#acaSettings"),
    settingsClose: $("#acaSettingsClose"),
    scrim: $("#acaScrim"),
    minimize: $("#acaMinimize"),
    close: $("#acaClose"),
    context: $("#acaContext"),
    contextToggle: $("#acaContextToggle"),
    contextGrid: $("#acaContextGrid"),
    memoryChips: $("#acaMemoryChips"),
    quickRail: $("#acaQuickRail"),
    messages: $("#acaMessages"),
    welcome: $("#acaWelcome"),
    voiceOverlay: $("#acaVoiceOverlay"),
    voiceLabel: $("#acaVoiceLabel"),
    voiceSub: $("#acaVoiceSub"),
    voiceStop: $("#acaVoiceStop"),
    voiceUse: $("#acaVoiceUse"),
    attachPopup: $("#acaAttachPopup"),
    attachToggle: $("#acaAttachToggle"),
    dropzone: $("#acaDropzone"),
    fileInput: $("#acaFileInput"),
    fileList: $("#acaFileList"),
    input: $("#acaInput"),
    sendBtn: $("#acaSendBtn"),
    micBtn: $("#acaMicBtn"),
    charCount: $("#acaCharCount"),
    offlineBanner: $("#acaOfflineBanner"),
    exportChat: $("#acaExportChat"),
    clearHistoryBtn: $("#acaClearHistoryBtn"),
  };

  const state = {
    open: false,
    sending: false,
    messages: [],       // {id, role, text, ts}
    files: [],           // pending attachments
    listening: false,
    speaking: false,
    historyId: null,
  };

  /* ------------------------------------------------------------------ *
   * Utility
   * ------------------------------------------------------------------ */
  function uid() { return Math.random().toString(36).slice(2, 10); }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function ripple(e, btn) {
    const rect = btn.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    const span = document.createElement("span");
    span.className = "aca-ripple-el";
    span.style.width = span.style.height = d + "px";
    span.style.left = (e.clientX - rect.left - d / 2) + "px";
    span.style.top = (e.clientY - rect.top - d / 2) + "px";
    btn.appendChild(span);
    setTimeout(() => span.remove(), 600);
  }
  $$(".aca-ripple").forEach((btn) => btn.addEventListener("click", (e) => ripple(e, btn)));

  /* ------------------------------------------------------------------ *
   * Minimal markdown renderer — headings, bold/italic, code, links,
   * unordered/ordered lists, tables. Escapes HTML first for safety.
   * ------------------------------------------------------------------ */
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function renderMarkdown(raw) {
    let text = escapeHtml(raw);

    // fenced code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`);

    // inline code
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // bold / italic
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>");

    // links
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // unordered lists
    text = text.replace(/(^|\n)([-*] .+(\n[-*] .+)*)/g, (m, lead, block) => {
      const items = block.split("\n").map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("");
      return `${lead}<ul>${items}</ul>`;
    });

    // ordered lists
    text = text.replace(/(^|\n)(\d+\. .+(\n\d+\. .+)*)/g, (m, lead, block) => {
      const items = block.split("\n").map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`).join("");
      return `${lead}<ol>${items}</ol>`;
    });

    // paragraphs (lines not already wrapped in a block tag)
    text = text
      .split(/\n{2,}/)
      .map((block) => (/^\s*<(ul|ol|pre|h\d|table)/.test(block) ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`))
      .join("");

    return text;
  }

  /* ------------------------------------------------------------------ *
   * Open / close window
   * ------------------------------------------------------------------ */
  function openWindow() {
    state.open = true;
    els.window.classList.add("is-open");
    els.window.setAttribute("aria-hidden", "false");
    els.launcher.classList.add("is-open");
    els.launcher.setAttribute("aria-expanded", "true");
    els.badge.hidden = true;
    setTimeout(() => els.input.focus(), 300);
  }

  function closeWindow() {
    state.open = false;
    els.window.classList.remove("is-open");
    els.window.setAttribute("aria-hidden", "true");
    els.launcher.classList.remove("is-open");
    els.launcher.setAttribute("aria-expanded", "false");
  }

  els.launcher.addEventListener("click", () => (state.open ? closeWindow() : openWindow()));
  els.close.addEventListener("click", closeWindow);
  els.minimize.addEventListener("click", closeWindow);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) closeWindow();
  });

  /* ------------------------------------------------------------------ *
   * Sidebar (chat history)
   * ------------------------------------------------------------------ */
  function toggleSidebar(force) {
    const willOpen = force !== undefined ? force : !els.sidebar.classList.contains("is-open");
    els.sidebar.classList.toggle("is-open", willOpen);
  }
  els.sidebarToggle.addEventListener("click", () => toggleSidebar());
  els.sidebarClose.addEventListener("click", () => toggleSidebar(false));

  function renderHistory(items) {
    // items: [{id, title, group: 'Today'|'Yesterday'|'Last Week', pinned, active}]
    els.historyList.querySelectorAll(".aca-history-item, .aca-sidebar-group-label").forEach((n) => n.remove());
    els.historyEmpty.hidden = items.length > 0;
    if (!items.length) return;

    const groups = ["Today", "Yesterday", "Last Week"];
    groups.forEach((group) => {
      const groupItems = items.filter((i) => i.group === group);
      if (!groupItems.length) return;
      const label = document.createElement("div");
      label.className = "aca-sidebar-group-label";
      label.textContent = group;
      els.historyList.appendChild(label);

      groupItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "aca-history-item" + (item.active ? " is-active" : "");
        row.innerHTML = `
          ${item.pinned ? '<svg class="aca-pin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 8 8l-6 1 4.5 4L5 20l7-4 7 4-1.5-7L22 9l-6-1z"/></svg>' : ""}
          <span class="aca-history-title">${escapeHtml(item.title)}</span>
          <div class="aca-history-actions">
            <button data-act="pin" aria-label="Pin chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 8 8l-6 1 4.5 4L5 20l7-4 7 4-1.5-7L22 9l-6-1z"/></svg></button>
            <button data-act="rename" aria-label="Rename chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button data-act="delete" aria-label="Delete chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
          </div>`;
        row.addEventListener("click", (e) => {
          if (e.target.closest("[data-act]")) return; // handled below
          // TODO: load conversation `item.id` from GET /history/<id>
          toggleSidebar(false);
        });
        row.querySelectorAll("[data-act]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const act = btn.dataset.act;
            // TODO: wire to real endpoints — pin/rename/delete `item.id`
            if (act === "delete") row.remove();
          });
        });
        els.historyList.appendChild(row);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Settings panel
   * ------------------------------------------------------------------ */
  function openSettings() {
    els.settings.classList.add("is-open");
    els.scrim.classList.add("is-open");
  }
  function closeSettings() {
    els.settings.classList.remove("is-open");
    els.scrim.classList.remove("is-open");
  }
  els.settingsToggle.addEventListener("click", openSettings);
  els.settingsClose.addEventListener("click", closeSettings);
  els.scrim.addEventListener("click", closeSettings);

  $$(".aca-seg-btn", els.settings).forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".aca-seg-btn", btn.parentElement).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      // TODO: persist preference (theme / font size / speech speed) client-side or via API
    });
  });

  $$(".aca-switch-track", els.settings).forEach((sw) => {
    sw.addEventListener("click", () => {
      const on = !sw.classList.contains("is-on");
      sw.classList.toggle("is-on", on);
      sw.setAttribute("aria-checked", String(on));
    });
  });

  els.clearHistoryBtn.addEventListener("click", () => {
    // TODO: call DELETE /history to clear all conversations
    renderHistory([]);
  });

  els.exportChat.addEventListener("click", () => {
    const text = state.messages.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "career-advisor-chat.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ------------------------------------------------------------------ *
   * Context panel + memory chips (populated from Flask/Firebase)
   * ------------------------------------------------------------------ */
  els.contextToggle.addEventListener("click", () => {
    const isOpen = els.context.classList.toggle("is-open");
    els.contextToggle.setAttribute("aria-expanded", String(isOpen));
  });

  function setContext(fields) {
    // fields: { prediction, academicCategory, employabilityScore, ... }
    Object.entries(fields || {}).forEach(([key, value]) => {
      const node = els.contextGrid.querySelector(`[data-field="${key}"]`);
      if (!node) return;
      if (value === null || value === undefined || value === "") {
        node.dataset.empty = "true";
      } else {
        node.textContent = value;
        node.dataset.empty = "false";
      }
    });
  }

  function setMemoryChips(chips) {
    // chips: [{ label: 'Resume Uploaded', icon: 'check' }]
    els.memoryChips.innerHTML = "";
    (chips || []).forEach((chip) => {
      const btn = document.createElement("button");
      btn.className = "aca-chip";
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>${escapeHtml(chip.label)}`;
      btn.addEventListener("click", () => {
        // TODO: clicking a memory chip could re-open the related panel/section
      });
      els.memoryChips.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ *
   * Quick actions + welcome suggestion cards -> feed the composer
   * ------------------------------------------------------------------ */
  const QUICK_PROMPTS = {
    analyze_resume: "Please analyze my uploaded resume and give me feedback.",
    generate_roadmap: "Generate a personalized learning roadmap for my target role.",
    improve_ats: "How can I improve my resume's ATS score?",
    mock_interview: "Let's do a mock interview for my target role.",
    career_advice: "What career advice do you have for someone in my position?",
    ai_projects: "Suggest AI project ideas that would stand out on my resume.",
    dsa_planner: "Create a DSA practice plan for me.",
    explain_ml: "Explain a machine learning concept I should know for interviews.",
    github_review: "Review my GitHub profile and suggest improvements.",
    linkedin_review: "Review my LinkedIn profile and suggest improvements.",
  };

  $$(".aca-quick-card", els.quickRail).forEach((btn) => {
    btn.addEventListener("click", () => sendMessage(QUICK_PROMPTS[btn.dataset.action] || btn.textContent));
  });

  $$(".aca-suggest-card", els.welcome).forEach((btn) => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.prompt));
  });

  /* ------------------------------------------------------------------ *
   * Composer: auto-grow, char count, send button state
   * ------------------------------------------------------------------ */
  function autoGrow() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
  }

  els.input.addEventListener("input", () => {
    autoGrow();
    els.charCount.textContent = `${els.input.value.length} / 2000`;
    els.sendBtn.disabled = els.input.value.trim().length === 0;
  });

  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (els.input.value.trim()) sendMessage(els.input.value.trim());
    }
  });

  els.sendBtn.addEventListener("click", () => {
    if (els.input.value.trim()) sendMessage(els.input.value.trim());
  });

  /* ------------------------------------------------------------------ *
   * Messages: render, typing indicator, streaming
   * ------------------------------------------------------------------ */
  function hideWelcome() {
    if (els.welcome && !els.welcome.hidden) els.welcome.hidden = true;
  }

  function scrollToBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "aca-msg is-user";
    row.innerHTML = `
      <div class="aca-msg-avatar">You</div>
      <div class="aca-msg-col">
        <div class="aca-bubble">${renderMarkdown(text)}</div>
        <div class="aca-msg-meta"><span>${timeNow()}</span></div>
      </div>`;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "aca-msg is-ai";
    row.id = "acaTypingRow";
    row.innerHTML = `
      <div class="aca-msg-avatar"></div>
      <div class="aca-msg-col">
        <div class="aca-typing"><span></span><span></span><span></span></div>
      </div>`;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const row = document.getElementById("acaTypingRow");
    if (row) row.remove();
  }

  function appendAiMessage(text) {
    const id = uid();
    const row = document.createElement("div");
    row.className = "aca-msg is-ai";
    row.dataset.id = id;
    row.innerHTML = `
      <div class="aca-msg-avatar"></div>
      <div class="aca-msg-col">
        <div class="aca-bubble">${renderMarkdown(text)}</div>
        <div class="aca-msg-meta">
          <span>${timeNow()}</span>
          <div class="aca-msg-actions">
            <button data-action="copy" aria-label="Copy response"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            <button data-action="like" aria-label="Like response"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>
            <button data-action="dislike" aria-label="Dislike response"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg></button>
            <button data-action="retry" aria-label="Regenerate response"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>
            <button data-action="speak" aria-label="Read aloud"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>
          </div>
        </div>
      </div>`;
    els.messages.appendChild(row);

    // collapse very long responses
    const bubble = row.querySelector(".aca-bubble");
    requestAnimationFrame(() => {
      if (bubble.scrollHeight > 220) {
        bubble.classList.add("is-collapsed");
        const expand = document.createElement("button");
        expand.className = "aca-expand-btn";
        expand.textContent = "Show more";
        expand.addEventListener("click", () => {
          bubble.classList.remove("is-collapsed");
          expand.remove();
        });
        row.querySelector(".aca-msg-col").insertBefore(expand, row.querySelector(".aca-msg-meta"));
      }
    });

    wireMessageActions(row, text);
    scrollToBottom();
    return row;
  }

  function wireMessageActions(row, text) {
    row.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "copy") {
          navigator.clipboard.writeText(text).catch(() => {});
          btn.classList.add("is-active");
          setTimeout(() => btn.classList.remove("is-active"), 1200);
        } else if (action === "like" || action === "dislike") {
          const other = action === "like" ? "dislike" : "like";
          row.querySelector(`[data-action="${other}"]`).classList.remove("is-active");
          btn.classList.toggle("is-active");
          // TODO: POST feedback to backend
        } else if (action === "retry") {
          // TODO: re-send the previous user message to /chat for a fresh response
          appendTypingIndicator();
          setTimeout(() => {
            removeTypingIndicator();
            appendAiMessage(text); // placeholder: re-render same text
          }, 900);
        } else if (action === "speak") {
          speakText(text, btn);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Sending a message — replace the mock reply with a real fetch('/chat')
   * ------------------------------------------------------------------ */
  function sendMessage(text) {
    if (state.sending) return;
    hideWelcome();
    appendUserMessage(text);
    state.messages.push({ id: uid(), role: "user", text, ts: Date.now() });
    els.input.value = "";
    autoGrow();
    els.charCount.textContent = "0 / 2000";
    els.sendBtn.disabled = true;
    state.sending = true;
    els.headerOrb.classList.add("is-thinking");

    appendTypingIndicator();

    // TODO — replace this mock with:
    // fetch('/chat', { method: 'POST', headers: {'Content-Type':'application/json'},
    //   body: JSON.stringify({ message: text, history_id: state.historyId }) })
    //   .then(r => r.json()).then(data => { ...appendAiMessage(data.reply)... })
    fetchMockReply(text)
      .then((reply) => {
        removeTypingIndicator();
        appendAiMessage(reply);
        state.messages.push({ id: uid(), role: "ai", text: reply, ts: Date.now() });
      })
      .catch(() => {
        removeTypingIndicator();
        appendAiMessage("Something went wrong reaching the AI service. Please try again.");
      })
      .finally(() => {
        state.sending = false;
        els.headerOrb.classList.remove("is-thinking");
      });
  }

  function fetchMockReply(text) {
    // Placeholder only — swap for a real call to the Flask /chat endpoint.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          "This is a placeholder response. Connect this widget to your `/chat` Flask route (Gemini API) to replace this with real, personalized answers about **" +
          escapeHtml(text).slice(0, 60) + "**."
        );
      }, 1100);
    });
  }

  els.clearChat.addEventListener("click", () => {
    els.messages.querySelectorAll(".aca-msg").forEach((m) => m.remove());
    state.messages = [];
    els.welcome.hidden = false;
  });

  /* ------------------------------------------------------------------ *
   * Voice input (Web Speech API where available; UI states always work)
   * ------------------------------------------------------------------ */
  let recognition = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setVoiceStatus(label, active) {
    els.voiceStatus.classList.toggle("is-active", !!active);
    els.voiceStatus.querySelector(":last-child") || null;
    els.voiceStatus.lastChild.textContent = label;
  }

  function openVoiceOverlay(label, sub) {
    els.voiceLabel.textContent = label;
    els.voiceSub.textContent = sub || "";
    els.voiceOverlay.classList.add("is-active");
  }
  function closeVoiceOverlay() {
    els.voiceOverlay.classList.remove("is-active");
  }

  function startListening() {
    if (!SpeechRecognition) {
      openVoiceOverlay("Voice input isn't supported in this browser", "Try Chrome or Edge, or type your message instead");
      setTimeout(closeVoiceOverlay, 2200);
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    state.listening = true;
    els.micBtn.classList.add("is-listening");
    setVoiceStatus("Listening", true);
    openVoiceOverlay("Listening...", "Speak now, tap stop when you're done");

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join("");
      els.input.value = transcript;
      autoGrow();
    };
    recognition.onerror = () => stopListening();
    recognition.onend = () => stopListening();
    recognition.start();
  }

  function stopListening() {
    state.listening = false;
    els.micBtn.classList.remove("is-listening");
    setVoiceStatus("Voice idle", false);
    closeVoiceOverlay();
    if (recognition) { try { recognition.stop(); } catch (e) {} }
  }

  els.micBtn.addEventListener("click", () => (state.listening ? stopListening() : startListening()));
  els.voiceStop.addEventListener("click", stopListening);
  els.voiceUse.addEventListener("click", () => {
    const text = els.input.value.trim();
    stopListening();
    if (text) sendMessage(text);
  });

  function speakText(text, btn) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
    utter.onstart = () => { state.speaking = true; els.headerOrb.classList.add("is-speaking"); setVoiceStatus("Speaking", true); btn && btn.classList.add("is-active"); };
    utter.onend = () => { state.speaking = false; els.headerOrb.classList.remove("is-speaking"); setVoiceStatus("Voice idle", false); btn && btn.classList.remove("is-active"); };
    window.speechSynthesis.speak(utter);
  }

  /* ------------------------------------------------------------------ *
   * File attachment popup + drag & drop + progress simulation
   * ------------------------------------------------------------------ */
  function toggleAttachPopup(force) {
    const willOpen = force !== undefined ? force : !els.attachPopup.classList.contains("is-open");
    els.attachPopup.classList.toggle("is-open", willOpen);
  }
  els.attachToggle.addEventListener("click", () => toggleAttachPopup());
  document.addEventListener("click", (e) => {
    if (!els.attachPopup.contains(e.target) && e.target !== els.attachToggle && !els.attachToggle.contains(e.target)) {
      toggleAttachPopup(false);
    }
  });

  $$(".aca-attach-type").forEach((btn) => {
    btn.addEventListener("click", () => els.fileInput.click());
  });
  els.dropzone.addEventListener("click", () => els.fileInput.click());

  ["dragenter", "dragover"].forEach((evt) =>
    els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.add("is-dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.remove("is-dragover"); })
  );
  els.dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  els.fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  function handleFiles(fileList) {
    Array.from(fileList).forEach((file) => {
      const id = uid();
      const item = document.createElement("div");
      item.className = "aca-file-item";
      item.dataset.id = id;
      item.innerHTML = `
        <span class="aca-file-name">${escapeHtml(file.name)}</span>
        <button class="aca-file-remove" aria-label="Remove file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      `;
      const progressWrap = document.createElement("div");
      progressWrap.className = "aca-file-progress";
      progressWrap.innerHTML = '<div class="aca-file-progress-bar"></div>';
      item.appendChild(progressWrap);
      els.fileList.appendChild(item);

      item.querySelector(".aca-file-remove").addEventListener("click", () => item.remove());

      // TODO: replace with a real upload — e.g. POST /upload-resume via FormData, tracking XHR progress
      const bar = progressWrap.querySelector(".aca-file-progress-bar");
      let pct = 0;
      const interval = setInterval(() => {
        pct += Math.random() * 25;
        bar.style.width = Math.min(pct, 100) + "%";
        if (pct >= 100) clearInterval(interval);
      }, 200);
    });
  }

  /* ------------------------------------------------------------------ *
   * Online / offline banner
   * ------------------------------------------------------------------ */
  function updateOnlineStatus() {
    els.offlineBanner.hidden = navigator.onLine;
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  /* ------------------------------------------------------------------ *
   * Public API — call these from your Flask/Firebase integration layer
   * ------------------------------------------------------------------ */
  window.ACA = {
    open: openWindow,
    close: closeWindow,
    sendMessage,
    setContext,
    setMemoryChips,
    renderHistory,
    notify: () => { els.badge.hidden = false; els.badge.textContent = ""; },
  };
})();
