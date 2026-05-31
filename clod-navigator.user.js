// ==UserScript==
// @name         CLōD Navigator - AI Beginner Guide
// @namespace    https://github.com/Mingz6/hackhub
// @version      1.1.0
// @description  AI-powered page navigation assistant for CLōD/Codex beginners. Type plain language questions, get visual guidance with spotlight highlights.
// @author       Team VideCoding (Ming, Andrew-Anqi)
// @match        *://*/*
// @include      *
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.clod.io
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (document.getElementById('clod-nav-sidebar')) return;
  console.log('%c[CLōD Navigator] Script loaded on: ' + location.href, 'color: #6c63ff; font-weight: bold; font-size: 14px;');
  document.documentElement.setAttribute('data-clod-navigator-loaded', 'true');

  // ─── Configuration ───────────────────────────────────────────────
  const CLOD_API_URL = 'https://api.clod.io/v1/chat/completions';
  const MODELS = ['meta-llama/Llama-4-Scout-17B-16E-Instruct', 'Qwen 2.5 72B', 'DeepSeek V3'];
  const STORAGE_KEY = 'clod_navigator_api_key';

  // ─── GM API Abstraction (classic GM_* + newer GM.* + fallbacks) ──
  function getGMApi(name) {
    if (name === 'getValue' && typeof GM_getValue === 'function') return GM_getValue;
    if (name === 'setValue' && typeof GM_setValue === 'function') return GM_setValue;
    if (name === 'xmlhttpRequest' && typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest;
    if (typeof GM !== 'undefined' && GM && typeof GM[name] === 'function') return GM[name].bind(GM);
    if (name === 'xmlhttpRequest' && typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') {
      return GM.xmlHttpRequest.bind(GM);
    }
    return null;
  }

  async function gmGetValue(key, defaultValue) {
    const getter = getGMApi('getValue');
    if (!getter) return defaultValue;
    const value = getter(key, defaultValue);
    return value && typeof value.then === 'function' ? await value : value;
  }

  async function gmSetValue(key, value) {
    const setter = getGMApi('setValue');
    if (!setter) {
      localStorage.setItem(key, value);
      return;
    }
    const result = setter(key, value);
    if (result && typeof result.then === 'function') await result;
  }

  function gmRequest(details) {
    return new Promise((resolve, reject) => {
      const requester = getGMApi('xmlhttpRequest');
      if (requester) {
        requester({
          ...details,
          anonymous: true,
          onload: resolve,
          onerror: (err) => {
            console.warn('[CLōD Navigator] GM_xmlhttpRequest failed, trying fetch fallback:', err);
            // Fallback to fetch on GM_xmlhttpRequest failure (Safari Tampermonkey workaround)
            fetch(details.url, { method: details.method, headers: details.headers, body: details.data, mode: 'cors' })
              .then(async (response) => resolve({ status: response.status, responseText: await response.text() }))
              .catch((fetchErr) => reject(new Error(`Network error: ${fetchErr.message || 'Load failed'}`)));
          },
          ontimeout: () => reject(new Error('Request timed out')),
        });
        return;
      }
      // No GM API available — use fetch directly
      fetch(details.url, { method: details.method, headers: details.headers, body: details.data, mode: 'cors' })
        .then(async (response) => resolve({ status: response.status, responseText: await response.text() }))
        .catch((err) => reject(new Error(`Fetch error: ${err.message}`)));
    });
  }

  // ─── CSS.escape polyfill ─────────────────────────────────────────
  function escapeCss(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(String(value));
    }
    // Minimal polyfill: escape characters that break CSS selectors
    return String(value)
      .replace(/\0/g, '\uFFFD')
      .replace(/([^\x20-\x7E])/g, '\\$&')
      .replace(/^(\d)/, '\\3$1 ')
      .replace(/["\\[\](){}#.:>+~,;!@$%^&*=|/]/g, '\\$&');
  }

  // ─── State ───────────────────────────────────────────────────────
  let apiKey = '';
  let isOpen = true;
  let isSending = false;
  let currentStep = 0;
  let steps = [];
  let highlightedEl = null;
  let overlayEl = null;
  let arrowEl = null;
  let activeStepHandler = null; // track active click handler for cleanup
  let chatHistory = [];
  const MAX_HISTORY = 20;
  const HISTORY_KEY = 'clod_navigator_history';

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
      pointer-events: auto;
      cursor: pointer;
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
    /* Typing indicator */
    .clod-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px !important;
    }
    .clod-typing .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #888;
      animation: clod-dot-pulse 1.2s infinite;
    }
    .clod-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .clod-typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes clod-dot-pulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1.1); }
    }
    /* Header buttons */
    .clod-header-actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .clod-header-btn {
      background: #3a3a55;
      border: 1px solid #555;
      color: #ccc;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .clod-header-btn:hover {
      background: #6c63ff;
      color: white;
      border-color: #6c63ff;
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
      if (id) selector = `#${escapeCss(id)}`;
      else if (ariaLabel) selector = `${tag}[aria-label="${escapeCss(ariaLabel)}"]`;
      else if (text && text.length < 40) selector = `${tag}`; // text-based match via findElementByDescriptor
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

  function findElementByDescriptor(desc) {
    // Try direct selector first
    if (desc.id) {
      const el = document.getElementById(desc.id);
      if (el) return el;
    }
    if (desc.ariaLabel) {
      const el = document.querySelector(`[aria-label="${escapeCss(desc.ariaLabel)}"]`);
      if (el) return el;
    }
    if (desc.placeholder) {
      const el = document.querySelector(`[placeholder="${escapeCss(desc.placeholder)}"]`);
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
      const el = document.querySelector(`.${escapeCss(cls)}`);
      if (el) return el;
    }
    return null;
  }

  // ─── CLōD API Call (multi-model fallback) ─────────────────────────
  async function callClodAPI(messages) {
    const errors = [];
    for (const model of MODELS) {
      try {
        return await callClodModel(model, messages);
      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }
    throw new Error(`All models failed. ${errors.join(' | ')}`);
  }

  function callClodModel(model, messages) {
    return new Promise((resolve, reject) => {
      gmRequest({
        method: 'POST',
        url: CLOD_API_URL,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          model,
          messages: messages,
          temperature: 0.3,
          max_completion_tokens: 4000
        }),
        anonymous: true,
      })
        .then((response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              const data = JSON.parse(response.responseText);
              const msg = data.choices[0].message;
              // DeepSeek R1: content = actual answer, reasoning_content = internal thinking (never use as response)
              if (msg.content && msg.content.trim()) {
                resolve(msg.content);
              } else {
                reject(new Error('Model returned empty content (reasoning-only response)'));
              }
            } catch (e) {
              reject(new Error('Failed to parse API response'));
            }
          } else {
            reject(new Error(`API error ${response.status}: ${response.responseText?.slice(0, 200)}`));
          }
        })
        .catch((err) => reject(new Error(`Network error: ${err.message || 'Unknown failure calling CLōD API'}`)));
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
      "action": "click",
      "target": {
        "tag": "button",
        "text": "Get API Key",
        "ariaLabel": "",
        "placeholder": "",
        "id": "",
        "classes": ""
      },
      "value": "text to type (only for 'type' action)",
      "explanation": "Why this step (short, beginner-friendly)"
    }
  ]
}

RULES:
1. Always respond in the JSON format above. No extra text, no reasoning, no analysis. Output ONLY the JSON object.
2. The "message" field must be a SHORT user-facing sentence (max 2 sentences). Never put your internal reasoning or analysis there.
3. Use ONLY elements that exist in the provided list. Never invent elements.
4. If you can't find the right element, set steps to empty [] and explain in message.
5. Keep explanations warm and encouraging — like a patient friend helping a beginner.
6. For multi-step tasks, list steps in order. The UI will guide one step at a time.
7. If the user says something like "I did it!" or confirms a step, congratulate them.
8. For greetings or "how do I start?", point them to the most logical first action on the page.
8. JSON property names and string values must use double quotes. Do not use comments, trailing commas, or JavaScript expressions.`;
  }

  // ─── Resilient JSON Parser ────────────────────────────────────────
  function parseAssistantJson(raw) {
    let cleaned = String(raw || '').trim();

    // Strip DeepSeek R1 <think>...</think> blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    // Find the outermost JSON object using bracket matching
    cleaned = extractJsonObject(cleaned);

    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')   // trailing commas
      .replace(/[\u201c\u201d]/g, '"')  // curly double quotes
      .replace(/[\u2018\u2019]/g, "'"); // curly single quotes

    try {
      const parsed = JSON.parse(cleaned);
      const message = typeof parsed.message === 'string' ? parsed.message : 'I found a possible next step.';
      const steps = Array.isArray(parsed.steps) ? parsed.steps : [];

      // Detect reasoning leak: model put its internal analysis in the message field
      const looksLikeReasoning = message.length > 300
        || /\b(idx \d|the user is asking|looking at the|current page context)\b/i.test(message);

      return {
        message: looksLikeReasoning
          ? (steps.length > 0 ? 'Here, let me show you! Follow the highlighted steps.' : 'Let me find the right element for you — try asking more specifically.')
          : message,
        steps
      };
    } catch (err) {
      console.warn('[CLōD Navigator] Could not parse model JSON:', raw, err);
      // Fallback: try to extract "message" value as plain text
      const msgMatch = raw.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (msgMatch) {
        return { message: msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), steps: [] };
      }
      return {
        message: 'I received a response, but could not turn it into page guidance. Try asking with simpler words like "where do I start?"',
        steps: []
      };
    }
  }

  // Bracket-matched JSON extraction (handles braces inside strings)
  function extractJsonObject(text) {
    const start = text.indexOf('{');
    if (start === -1) return text;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    // Fallback: first { to last }
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace > start) return text.slice(start, lastBrace + 1);
    return text;
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
    return parseAssistantJson(raw);
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

    // Auto-collapse sidebar so the spotlight isn't hidden behind it
    if (isOpen) {
      const sidebar = document.getElementById('clod-nav-sidebar');
      const toggle = document.getElementById('clod-nav-toggle');
      isOpen = false;
      sidebar.classList.add('collapsed');
      toggle.classList.add('collapsed');
      toggle.textContent = '▶';
    }

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
      arrow.textContent = '�';
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
  function cleanupStepHandler() {
    if (activeStepHandler) {
      activeStepHandler.el.removeEventListener('click', activeStepHandler.fn);
      activeStepHandler = null;
    }
  }

  function startStepGuide(stepsArray) {
    cleanupStepHandler();
    steps = stepsArray;
    currentStep = 0;
    updateStepBar();
    showCurrentStep();
  }

  function showCurrentStep() {
    if (currentStep >= steps.length) {
      clearHighlight();
      showConfetti();
      addMessage('system', '🎉 You did it! All steps completed successfully!');
      document.getElementById('clod-nav-step-bar').classList.remove('active');
      steps = [];
      currentStep = 0;
      if (!isOpen) {
        const sidebar = document.getElementById('clod-nav-sidebar');
        const toggle = document.getElementById('clod-nav-toggle');
        isOpen = true;
        sidebar.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '◀';
      }
      return;
    }

    const step = steps[currentStep];
    const targetEl = findElementByDescriptor(step.target);

    if (targetEl) {
      spotlightElement(targetEl, step.explanation);

      const clickHandler = () => {
        cleanupStepHandler();
        currentStep++;
        updateStepBar();

        if (!isOpen) {
          const sidebar = document.getElementById('clod-nav-sidebar');
          const toggle = document.getElementById('clod-nav-toggle');
          isOpen = true;
          sidebar.classList.remove('collapsed');
          toggle.classList.remove('collapsed');
          toggle.textContent = '◀';
        }

        if (currentStep < steps.length) {
          addMessage('system', `✅ Step ${currentStep} done! Moving to next...`);
          setTimeout(() => showCurrentStep(), 800);
        } else {
          showCurrentStep(); // triggers completion
        }
      };

      // Store reference for cleanup
      activeStepHandler = { el: targetEl, fn: clickHandler };
      targetEl.addEventListener('click', clickHandler, { once: true });
    } else {
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

  function showTypingIndicator() {
    const container = document.getElementById('clod-nav-messages');
    const el = document.createElement('div');
    el.className = 'clod-msg assistant clod-typing';
    el.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  async function handleSend() {
    const input = document.getElementById('clod-nav-input');
    const btn = document.getElementById('clod-nav-send');
    const text = input.value.trim();
    if (!text || isSending) return;

    isSending = true;
    input.value = '';
    btn.disabled = true;
    addMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    if (chatHistory.length > MAX_HISTORY) chatHistory = chatHistory.slice(-MAX_HISTORY);
    saveChatHistory();

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
      // Cancel any active step guide
      cleanupStepHandler();

      const result = await processMessage(text);

      removeTypingIndicator(typingEl);

      addMessage('assistant', result.message);
      chatHistory.push({ role: 'assistant', content: result.message });
      if (chatHistory.length > MAX_HISTORY) chatHistory = chatHistory.slice(-MAX_HISTORY);
      saveChatHistory();

      if (result.steps && result.steps.length > 0) {
        startStepGuide(result.steps);
      } else {
        clearHighlight();
      }
    } catch (err) {
      removeTypingIndicator(typingEl);
      console.error('[CLōD Navigator]', err);
      if (err.message.includes('401') || err.message.includes('403')) {
        addMessage('error', 'API key seems invalid. Click the ⚙️ to update it.');
      } else if (err.message.includes('parse')) {
        addMessage('assistant', 'Let me think about that differently... Could you rephrase your question?');
      } else {
        addMessage('error', `Oops! Something went wrong. (${err.message})`);
      }
    } finally {
      isSending = false;
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
        <div class="clod-header-actions">
          <button class="clod-header-btn" id="clod-btn-clear" title="Clear chat">🗑️ Clear</button>
          <button class="clod-header-btn" id="clod-btn-settings" title="Change API key">⚙️ Key</button>
        </div>
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

    // Escape key: dismiss spotlight/overlay
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cleanupStepHandler();
        clearHighlight();
        document.getElementById('clod-nav-step-bar')?.classList.remove('active');
        steps = [];
        currentStep = 0;
        // Re-expand sidebar if collapsed by spotlight
        if (!isOpen) {
          isOpen = true;
          sidebar.classList.remove('collapsed');
          toggle.classList.remove('collapsed');
          toggle.textContent = '◀';
        }
      }
    });

    // Overlay click: dismiss spotlight
    overlay.addEventListener('click', () => {
      cleanupStepHandler();
      clearHighlight();
      document.getElementById('clod-nav-step-bar')?.classList.remove('active');
      steps = [];
      currentStep = 0;
      if (!isOpen) {
        isOpen = true;
        sidebar.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '◀';
      }
    });

    // Clear chat button
    document.getElementById('clod-btn-clear').addEventListener('click', () => {
      chatHistory = [];
      saveChatHistory();
      cleanupStepHandler();
      clearHighlight();
      document.getElementById('clod-nav-step-bar')?.classList.remove('active');
      steps = [];
      currentStep = 0;
      document.getElementById('clod-nav-messages').innerHTML = '';
      showWelcome();
    });

    // Settings button (re-enter API key)
    document.getElementById('clod-btn-settings').addEventListener('click', () => {
      showKeySetup();
    });

    // Check for API key
    gmGetValue(STORAGE_KEY, localStorage.getItem(STORAGE_KEY) || '')
      .then(loadKey)
      .catch(() => loadKey(localStorage.getItem(STORAGE_KEY) || ''));
  }

  function loadKey(storedKey) {
    if (storedKey) {
      apiKey = storedKey;
      loadChatHistory().then(restored => {
        if (!restored) showWelcome();
      });
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
        gmSetValue(STORAGE_KEY, key);
        document.getElementById('clod-nav-messages').innerHTML = '';
        showWelcome();
      }
    });
  }

  function saveChatHistory() {
    const data = JSON.stringify(chatHistory.slice(-20));
    gmSetValue(HISTORY_KEY, data);
  }

  async function loadChatHistory() {
    const raw = await gmGetValue(HISTORY_KEY, localStorage.getItem(HISTORY_KEY) || '[]');
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        chatHistory = parsed;
        parsed.forEach(msg => addMessage(msg.role, msg.content));
        return true;
      }
    } catch (_) {}
    return false;
  }

  function showWelcome() {
    addMessage('assistant', "Hi! 👋 I'm your CLōD Navigator. I can help you find any button, input, or feature on this page. Just describe what you want to do in plain language!");
    addMessage('system', '💡 Try: "How do I start?" or "Where do I put my API key?"');
  }

  // ─── Initialize ──────────────────────────────────────────────────
  function init() {
    if (document.body && document.head) {
      buildUI();
      return;
    }

    const startWhenReady = () => {
      if (document.body && document.head) {
        buildUI();
      } else {
        setTimeout(startWhenReady, 100);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startWhenReady, { once: true });
    } else {
      startWhenReady();
    }
  }

  init();
})();
