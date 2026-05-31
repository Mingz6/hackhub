// ==UserScript==
// @name         CLōD Navigator - AI Beginner Guide
// @namespace    https://github.com/Mingz6/hackhub
// @version      1.0.1
// @description  AI-powered page navigation assistant for CLōD/Codex beginners. Type plain language questions, get visual guidance with spotlight highlights.
// @author       Team VideCoding (Ming, Andrew-Anqi)
// @match        https://app.clod.io/*
// @match        https://clod.io/*
// @match        https://*.clod.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.clod.io
// @connect      clod.io
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  console.log('[CLōD Navigator] Script loaded on:', location.href);

  // ─── Configuration ───────────────────────────────────────────────
  const CLOD_API_URL = 'https://api.clod.io/v1/chat/completions';
  const MODEL = 'DeepSeek V3@latency';
  const STORAGE_KEY = 'clod_navigator_api_key';

  // ─── State ───────────────────────────────────────────────────────
  let apiKey = '';
  let isOpen = true;
  let currentStep = 0;
  let steps = [];
  let highlightedEl = null;
  let overlayEl = null;
  let arrowEl = null;
  let chatHistory = [];

  // ─── Styles ──────────────────────────────────────────────────────
  const STYLES = `
    #clod-nav-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 360px;
      height: 100vh;
      background: #1a1a2e;
      border-left: 2px solid #6c63ff;
      z-index: 2147483640;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e0e0e0;
      box-shadow: -4px 0 20px rgba(108, 99, 255, 0.3);
      transition: transform 0.3s ease;
    }
    #clod-nav-sidebar.collapsed {
      transform: translateX(100%);
    }
    #clod-nav-toggle {
      position: fixed;
      top: 50%;
      right: 360px;
      transform: translateY(-50%);
      width: 40px;
      height: 80px;
      background: #6c63ff;
      border: none;
      border-radius: 8px 0 0 8px;
      color: white;
      font-size: 18px;
      cursor: pointer;
      z-index: 2147483641;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: right 0.3s ease;
    }
    #clod-nav-toggle.collapsed {
      right: 0;
    }
    #clod-nav-header {
      padding: 16px;
      background: linear-gradient(135deg, #6c63ff, #3f3d56);
      border-bottom: 1px solid #333;
      text-align: center;
    }
    #clod-nav-header h2 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #fff;
    }
    #clod-nav-header p {
      margin: 0;
      font-size: 11px;
      color: #c4c0ff;
    }
    #clod-nav-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .clod-msg {
      max-width: 90%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .clod-msg.user {
      align-self: flex-end;
      background: #6c63ff;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .clod-msg.assistant {
      align-self: flex-start;
      background: #2d2d44;
      color: #e0e0e0;
      border-bottom-left-radius: 4px;
    }
    .clod-msg.system {
      align-self: center;
      background: #1e3a2e;
      color: #7dffb3;
      font-size: 12px;
      text-align: center;
      border-radius: 8px;
    }
    .clod-msg.error {
      align-self: center;
      background: #3a1e1e;
      color: #ff7d7d;
      font-size: 12px;
      text-align: center;
    }
    #clod-nav-input-area {
      padding: 12px;
      border-top: 1px solid #333;
      display: flex;
      gap: 8px;
    }
    #clod-nav-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #444;
      border-radius: 20px;
      background: #2d2d44;
      color: #e0e0e0;
      font-size: 13px;
      outline: none;
    }
    #clod-nav-input:focus {
      border-color: #6c63ff;
    }
    #clod-nav-input::placeholder {
      color: #888;
    }
    #clod-nav-send {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: #6c63ff;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #clod-nav-send:hover {
      background: #5a52e0;
    }
    #clod-nav-send:disabled {
      background: #444;
      cursor: not-allowed;
    }
    /* Key setup */
    #clod-nav-key-setup {
      padding: 16px;
      text-align: center;
    }
    #clod-nav-key-setup input {
      width: 100%;
      padding: 10px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #2d2d44;
      color: #e0e0e0;
      font-size: 13px;
      margin: 8px 0;
    }
    #clod-nav-key-setup button {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      background: #6c63ff;
      color: white;
      cursor: pointer;
      font-size: 13px;
    }
    /* Overlay & spotlight */
    #clod-nav-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2147483630;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #clod-nav-overlay.active {
      opacity: 1;
    }
    #clod-nav-spotlight {
      position: fixed;
      border: 3px solid #6c63ff;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(108, 99, 255, 0.8);
      z-index: 2147483635;
      pointer-events: none;
      transition: all 0.4s ease;
      animation: clod-pulse 1.5s infinite;
    }
    @keyframes clod-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(108, 99, 255, 0.6); }
      50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 40px rgba(108, 99, 255, 1); }
    }
    #clod-nav-arrow {
      position: fixed;
      z-index: 2147483636;
      pointer-events: none;
      font-size: 32px;
      animation: clod-bounce 0.8s infinite;
    }
    @keyframes clod-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    #clod-nav-tooltip {
      position: fixed;
      z-index: 2147483637;
      background: #6c63ff;
      color: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      max-width: 260px;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    /* Confetti */
    .clod-confetti {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483645;
    }
    .confetti-piece {
      position: absolute;
      width: 10px;
      height: 10px;
      opacity: 0;
      animation: confetti-fall 2s ease forwards;
    }
    @keyframes confetti-fall {
      0% { opacity: 1; transform: translateY(-20px) rotate(0deg); }
      100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
    }
    /* Step indicator */
    #clod-nav-step-bar {
      padding: 8px 12px;
      background: #2d2d44;
      border-top: 1px solid #333;
      display: none;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    #clod-nav-step-bar.active {
      display: flex;
    }
    .step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #555;
    }
    .step-dot.done {
      background: #7dffb3;
    }
    .step-dot.current {
      background: #6c63ff;
      box-shadow: 0 0 6px #6c63ff;
    }
  `;

  // ─── DOM Page Context Extraction ─────────────────────────────────
  function getPageContext() {
    const interactiveEls = [];
    const selectors = [
      'button', 'a[href]', 'input', 'select', 'textarea',
      '[role="button"]', '[role="tab"]', '[role="menuitem"]',
      '[onclick]', '.btn', '[class*="button"]', '[class*="btn"]',
      'label', 'nav a', '[data-testid]', '[aria-label]'
    ];

    const seen = new Set();
    document.querySelectorAll(selectors.join(', ')).forEach((el, idx) => {
      if (idx > 150) return; // cap for token budget
      if (!el.offsetParent && el.tagName !== 'INPUT') return; // skip hidden
      const text = (el.textContent || '').trim().slice(0, 80);
      const ariaLabel = el.getAttribute('aria-label') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const id = el.id || '';
      const classes = el.className && typeof el.className === 'string'
        ? el.className.split(' ').filter(c => c.length > 2).slice(0, 3).join('.')
        : '';
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || '';

      const sig = `${tag}|${text}|${ariaLabel}`;
      if (seen.has(sig)) return;
      seen.add(sig);

      const descriptor = {
        idx,
        tag,
        type,
        id: id || undefined,
        classes: classes || undefined,
        text: text || undefined,
        ariaLabel: ariaLabel || undefined,
        placeholder: placeholder || undefined,
      };
      // Build a CSS selector for this element
      let selector = tag;
      if (id) selector = `#${CSS.escape(id)}`;
      else if (ariaLabel) selector = `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;
      else if (text && text.length < 40) selector = `${tag}:has-text("${text.slice(0, 30)}")`;
      else if (classes) selector = `${tag}.${classes.split('.')[0]}`;

      descriptor.selector = selector;
      interactiveEls.push(descriptor);
    });

    return {
      url: location.href,
      title: document.title,
      pageText: document.body?.innerText?.slice(0, 800) || '',
      elements: interactiveEls
    };
  }

  // ─── Build selector that actually works with querySelector ───────
  function buildQuerySelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.ariaLabel) return `${el.tag}[aria-label="${el.ariaLabel}"]`;
    if (el.placeholder) return `${el.tag}[placeholder="${el.placeholder}"]`;
    if (el.classes) {
      const cls = el.classes.split('.')[0];
      if (cls) return `${el.tag}.${CSS.escape(cls)}`;
    }
    // Fallback: tag + text content match via iteration
    return null;
  }

  function findElementByDescriptor(desc) {
    // Try direct selector first
    if (desc.id) {
      const el = document.getElementById(desc.id);
      if (el) return el;
    }
    if (desc.ariaLabel) {
      const el = document.querySelector(`[aria-label="${CSS.escape(desc.ariaLabel)}"]`);
      if (el) return el;
    }
    if (desc.placeholder) {
      const el = document.querySelector(`[placeholder="${CSS.escape(desc.placeholder)}"]`);
      if (el) return el;
    }
    // Text content match
    if (desc.text) {
      const candidates = document.querySelectorAll(desc.tag || '*');
      for (const c of candidates) {
        const t = (c.textContent || '').trim();
        if (t === desc.text || t.includes(desc.text)) return c;
      }
    }
    // Class match
    if (desc.classes) {
      const cls = desc.classes.split('.')[0];
      const el = document.querySelector(`.${CSS.escape(cls)}`);
      if (el) return el;
    }
    return null;
  }

  // ─── CLōD API Call ───────────────────────────────────────────────
  function callClodAPI(messages) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: CLOD_API_URL,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          model: MODEL,
          messages: messages,
          temperature: 0.3,
          max_completion_tokens: 1200
        }),
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              const data = JSON.parse(response.responseText);
              resolve(data.choices[0].message.content);
            } catch (e) {
              reject(new Error('Failed to parse API response'));
            }
          } else {
            reject(new Error(`API error ${response.status}: ${response.responseText?.slice(0, 200)}`));
          }
        },
        onerror: (err) => reject(new Error('Network error calling CLōD API'))
      });
    });
  }

  // ─── System Prompt ───────────────────────────────────────────────
  function getSystemPrompt(pageContext) {
    return `You are CLōD Navigator, a friendly AI guide that helps complete beginners navigate the CLōD/Codex web interface. The user cannot see code — they only see the webpage and your chat sidebar.

Your job: When the user asks a question in plain language, identify which button/input/element on the page they should click or interact with, and provide step-by-step guidance.

CURRENT PAGE CONTEXT:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Visible text (excerpt): ${pageContext.pageText.slice(0, 400)}

INTERACTIVE ELEMENTS ON PAGE (these are the clickable/typeable things):
${JSON.stringify(pageContext.elements.slice(0, 60), null, 1)}

RESPONSE FORMAT — You MUST respond in valid JSON (no markdown, no backticks):
{
  "message": "Your friendly explanation to the user (1-3 sentences, encouraging tone)",
  "steps": [
    {
      "action": "click" | "type" | "look",
      "target": { exact element descriptor from the list above — include id, ariaLabel, text, classes, tag },
      "value": "text to type (only for 'type' action)",
      "explanation": "Why this step (short, beginner-friendly)"
    }
  ]
}

RULES:
1. Always respond in the JSON format above. No extra text.
2. Use ONLY elements that exist in the provided list. Never invent elements.
3. If you can't find the right element, set steps to empty [] and explain in message.
4. Keep explanations warm and encouraging — like a patient friend helping a beginner.
5. For multi-step tasks, list steps in order. The UI will guide one step at a time.
6. If the user says something like "I did it!" or confirms a step, congratulate them.
7. For greetings or "how do I start?", point them to the most logical first action on the page.`;
  }

  // ─── Process User Message ────────────────────────────────────────
  async function processMessage(userText) {
    const pageContext = getPageContext();
    const systemPrompt = getSystemPrompt(pageContext);

    // Build messages array (keep last 4 exchanges for context)
    const recentHistory = chatHistory.slice(-8);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: userText }
    ];

    const raw = await callClodAPI(messages);

    // Parse JSON response (strip markdown fences if model adds them)
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    return parsed;
  }

  // ─── Spotlight & Highlight ───────────────────────────────────────
  function clearHighlight() {
    document.getElementById('clod-nav-spotlight')?.remove();
    document.getElementById('clod-nav-arrow')?.remove();
    document.getElementById('clod-nav-tooltip')?.remove();
    const overlay = document.getElementById('clod-nav-overlay');
    if (overlay) overlay.classList.remove('active');
    if (highlightedEl) {
      highlightedEl.style.position = '';
      highlightedEl.style.zIndex = '';
      highlightedEl = null;
    }
  }

  function spotlightElement(el, explanation) {
    clearHighlight();
    if (!el) return;

    highlightedEl = el;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = 8;

      // Overlay
      const overlay = document.getElementById('clod-nav-overlay');
      overlay.classList.add('active');

      // Spotlight ring
      const spot = document.createElement('div');
      spot.id = 'clod-nav-spotlight';
      spot.style.top = `${rect.top - pad}px`;
      spot.style.left = `${rect.left - pad}px`;
      spot.style.width = `${rect.width + pad * 2}px`;
      spot.style.height = `${rect.height + pad * 2}px`;
      document.body.appendChild(spot);

      // Arrow
      const arrow = document.createElement('div');
      arrow.id = 'clod-nav-arrow';
      arrow.textContent = '👆';
      arrow.style.top = `${rect.top - 45}px`;
      arrow.style.left = `${rect.left + rect.width / 2 - 16}px`;
      document.body.appendChild(arrow);

      // Tooltip
      if (explanation) {
        const tip = document.createElement('div');
        tip.id = 'clod-nav-tooltip';
        tip.textContent = explanation;
        tip.style.top = `${rect.bottom + 12}px`;
        tip.style.left = `${Math.max(10, rect.left - 20)}px`;
        document.body.appendChild(tip);
      }

      // Make element clickable above overlay
      el.style.position = 'relative';
      el.style.zIndex = '2147483638';
    }, 300);
  }

  // ─── Confetti ────────────────────────────────────────────────────
  function showConfetti() {
    const container = document.createElement('div');
    container.className = 'clod-confetti';
    const colors = ['#6c63ff', '#7dffb3', '#ff6b6b', '#ffd93d', '#6bddff', '#ff9ff3'];

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.top = `${Math.random() * -20}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${6 + Math.random() * 8}px`;
      container.appendChild(piece);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 2500);
  }

  // ─── Step-by-Step Execution ──────────────────────────────────────
  function startStepGuide(stepsArray) {
    steps = stepsArray;
    currentStep = 0;
    updateStepBar();
    showCurrentStep();
  }

  function showCurrentStep() {
    if (currentStep >= steps.length) {
      // All steps done!
      clearHighlight();
      showConfetti();
      addMessage('system', '🎉 You did it! All steps completed successfully!');
      document.getElementById('clod-nav-step-bar').classList.remove('active');
      steps = [];
      currentStep = 0;
      return;
    }

    const step = steps[currentStep];
    const targetEl = findElementByDescriptor(step.target);

    if (targetEl) {
      spotlightElement(targetEl, step.explanation);

      // Listen for the user's click on the target
      const clickHandler = () => {
        targetEl.removeEventListener('click', clickHandler);
        currentStep++;
        updateStepBar();

        if (currentStep < steps.length) {
          addMessage('system', `✅ Step ${currentStep} done! Moving to next...`);
          setTimeout(() => showCurrentStep(), 800);
        } else {
          showCurrentStep(); // triggers completion
        }
      };
      targetEl.addEventListener('click', clickHandler, { once: true });
    } else {
      // Can't find element — skip with message
      addMessage('error', `Hmm, I can't find that element on the page right now. Try scrolling or let me know what you see.`);
      clearHighlight();
    }
  }

  function updateStepBar() {
    const bar = document.getElementById('clod-nav-step-bar');
    if (steps.length > 1) {
      bar.classList.add('active');
      bar.innerHTML = `<span>Step ${currentStep + 1}/${steps.length}</span>` +
        steps.map((_, i) => {
          let cls = 'step-dot';
          if (i < currentStep) cls += ' done';
          if (i === currentStep) cls += ' current';
          return `<div class="${cls}"></div>`;
        }).join('');
    } else {
      bar.classList.remove('active');
    }
  }

  // ─── UI Message Handling ─────────────────────────────────────────
  function addMessage(role, text) {
    const container = document.getElementById('clod-nav-messages');
    const msg = document.createElement('div');
    msg.className = `clod-msg ${role}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  async function handleSend() {
    const input = document.getElementById('clod-nav-input');
    const btn = document.getElementById('clod-nav-send');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    btn.disabled = true;
    addMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    try {
      const result = await processMessage(text);

      // Display assistant message
      addMessage('assistant', result.message);
      chatHistory.push({ role: 'assistant', content: result.message });

      // Handle steps
      if (result.steps && result.steps.length > 0) {
        startStepGuide(result.steps);
      } else {
        clearHighlight();
      }
    } catch (err) {
      console.error('[CLōD Navigator]', err);
      if (err.message.includes('401') || err.message.includes('403')) {
        addMessage('error', 'API key seems invalid. Click the ⚙️ to update it.');
      } else if (err.message.includes('parse')) {
        addMessage('assistant', 'Let me think about that differently... Could you rephrase your question?');
      } else {
        addMessage('error', `Oops! Something went wrong. (${err.message})`);
      }
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ─── Build UI ────────────────────────────────────────────────────
  function buildUI() {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    // Overlay (always present, hidden until active)
    const overlay = document.createElement('div');
    overlay.id = 'clod-nav-overlay';
    document.body.appendChild(overlay);

    // Toggle button
    const toggle = document.createElement('button');
    toggle.id = 'clod-nav-toggle';
    toggle.textContent = '◀';
    toggle.title = 'Toggle CLōD Navigator';
    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      sidebar.classList.toggle('collapsed', !isOpen);
      toggle.classList.toggle('collapsed', !isOpen);
      toggle.textContent = isOpen ? '◀' : '▶';
    });
    document.body.appendChild(toggle);

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'clod-nav-sidebar';

    sidebar.innerHTML = `
      <div id="clod-nav-header">
        <h2>🧭 CLōD Navigator</h2>
        <p>Your AI guide — just ask in plain language!</p>
      </div>
      <div id="clod-nav-messages"></div>
      <div id="clod-nav-step-bar"></div>
      <div id="clod-nav-input-area">
        <input id="clod-nav-input" type="text" placeholder="Ask me anything... e.g. 'How do I start?'" autocomplete="off" />
        <button id="clod-nav-send">➤</button>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Event listeners
    document.getElementById('clod-nav-send').addEventListener('click', handleSend);
    document.getElementById('clod-nav-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Check for API key
    GM_getValue(STORAGE_KEY, '').then ? 
      GM_getValue(STORAGE_KEY, '').then(loadKey) : 
      loadKey(GM_getValue(STORAGE_KEY, ''));
  }

  function loadKey(storedKey) {
    if (storedKey) {
      apiKey = storedKey;
      showWelcome();
    } else {
      showKeySetup();
    }
  }

  function showKeySetup() {
    const messages = document.getElementById('clod-nav-messages');
    messages.innerHTML = `
      <div id="clod-nav-key-setup">
        <p style="font-size: 14px; margin-bottom: 12px;">👋 Welcome! I need your CLōD API key to help you navigate.</p>
        <p style="font-size: 11px; color: #aaa; margin-bottom: 8px;">Get your free key at <a href="https://app.clod.io" target="_blank" style="color: #6c63ff;">app.clod.io</a> → API Keys</p>
        <input id="clod-key-input" type="password" placeholder="Paste your CLōD API key here..." />
        <button id="clod-key-save">Save & Start</button>
      </div>
    `;
    document.getElementById('clod-key-save').addEventListener('click', () => {
      const keyInput = document.getElementById('clod-key-input');
      const key = keyInput.value.trim();
      if (key) {
        apiKey = key;
        GM_setValue(STORAGE_KEY, key);
        document.getElementById('clod-nav-messages').innerHTML = '';
        showWelcome();
      }
    });
  }

  function showWelcome() {
    addMessage('assistant', "Hi! 👋 I'm your CLōD Navigator. I can help you find any button, input, or feature on this page. Just describe what you want to do in plain language!");
    addMessage('system', '💡 Try: "How do I start?" or "Where do I put my API key?"');
  }

  // ─── Initialize ──────────────────────────────────────────────────
  function init() {
    // Guard: don't inject twice (Chrome can re-run scripts on SPA navigation)
    if (document.getElementById('clod-nav-sidebar')) return;

    // Wait for body to exist (Chrome MV3 timing can be different from Safari)
    if (!document.body) {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          buildUI();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      return;
    }

    buildUI();
  }

  // document-idle means DOM is ready, but double-check for SPA frameworks
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
