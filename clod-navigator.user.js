// ==UserScript==
// @name         CLōD Navigator - AI Beginner Guide
// @namespace    https://github.com/Mingz6/hackhub
// @version      1.2.0
// @description  AI-powered page navigation assistant for CLōD/Codex beginners. Type plain language questions, get visual guidance with spotlight highlights.
// @author       Team VideCoding (Ming, Andrew-Anqi)
// @match        *://*/*
// @include      *
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.clod.io
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (document.getElementById('clod-nav-sidebar')) return;
  console.log('%c[CLōD Navigator] Script loaded on: ' + location.href, 'color: #6c63ff; font-weight: bold; font-size: 14px;');
  console.log(
    '%c[CLōD Navigator] Demo / Testing shortcuts:\n' +
    '  ⌥ Option + Shift + W  →  replay welcome effect instantly (no reload)\n' +
    '  __clodPreviewWelcome()  →  same, via console\n' +
    '  __clodResetWelcome()    →  full reset (clears storage + reloads)',
    'color: #a89fff; font-size: 12px;'
  );
  document.documentElement.setAttribute('data-clod-navigator-loaded', 'true');

  // ─── Configuration ───────────────────────────────────────────────
  const CLOD_API_URL = 'https://api.clod.io/v1/chat/completions';
  const MODELS = ['meta-llama/Llama-4-Scout-17B-16E-Instruct', 'Qwen 2.5 72B', 'DeepSeek V3'];
  const STORAGE_KEY = 'clod_navigator_api_key';
  const PENDING_GUIDE_KEY = 'clod_navigator_pending_guide';

  // Tampermonkey exposes GM APIs differently across versions. These wrappers
  // support both the classic GM_* functions and the newer GM.* Promise APIs.
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
  let pendingDestinationPromptShown = false;

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
    .clod-msg.card {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .clod-msg-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .clod-msg-action-btn {
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .clod-msg-action-btn.primary {
      background: #6c63ff;
      color: white;
    }
    .clod-msg-action-btn.secondary {
      background: #374151;
      color: #f9fafb;
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
      background: rgba(0, 0, 0, 0.35);
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
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.42), 0 0 30px rgba(108, 99, 255, 0.9);
      z-index: 2147483635;
      pointer-events: none;
      transition: all 0.4s ease;
      animation: clod-pulse 1.5s infinite;
    }
    @keyframes clod-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.42), 0 0 20px rgba(108, 99, 255, 0.7); }
      50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.42), 0 0 40px rgba(108, 99, 255, 1); }
    }
    .clod-nav-target-active {
      background: rgba(255, 255, 255, 0.96) !important;
      color: #111827 !important;
      opacity: 1 !important;
      filter: none !important;
      box-shadow: 0 0 0 3px #6c63ff, 0 0 24px rgba(108, 99, 255, 0.9) !important;
      border-radius: 8px !important;
    }
    .clod-nav-target-active * {
      color: #111827 !important;
      opacity: 1 !important;
      filter: none !important;
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
    /* ─── Welcome Effect ─── */
    #clod-welcome-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(10, 10, 25, 0.72);
      z-index: 2147483628;
      overflow: hidden;
      pointer-events: auto;
      animation: clod-welcome-in 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes clod-welcome-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #clod-welcome-sheen {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        108deg,
        transparent 20%,
        rgba(192, 210, 255, 0.04) 36%,
        rgba(220, 232, 255, 0.11) 46%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(220, 232, 255, 0.11) 54%,
        rgba(192, 210, 255, 0.04) 64%,
        transparent 80%
      );
      transform: translateX(-100%);
      animation: clod-sheen-sweep 2.6s cubic-bezier(0.4, 0, 0.2, 1) 0.35s forwards;
    }
    @keyframes clod-sheen-sweep {
      from { transform: translateX(-100%); }
      to   { transform: translateX(220%); }
    }
    .clod-welcome-orb {
      position: absolute;
      left: -40px;
      color: rgba(210, 225, 255, 0.78);
      pointer-events: none;
      filter: drop-shadow(0 0 4px rgba(180, 205, 255, 0.65));
      animation: clod-orb-flow linear forwards;
    }
    @keyframes clod-orb-flow {
      0%   { transform: translateX(0)      translateY(0px);    opacity: 0; }
      7%   { opacity: 1; }
      28%  { transform: translateX(28vw)   translateY(-13px); }
      52%  { transform: translateX(52vw)   translateY(9px);  }
      76%  { transform: translateX(76vw)   translateY(-7px); }
      93%  { opacity: 0.75; }
      100% { transform: translateX(112vw)  translateY(0px);    opacity: 0; }
    }
    #clod-welcome-sidebar-glow {
      position: fixed;
      top: 0;
      right: 0;
      width: 368px;
      height: 100vh;
      z-index: 2147483629;
      pointer-events: none;
      box-shadow: -10px 0 50px rgba(108, 99, 255, 0.55),
                  inset 0 0 40px rgba(108, 99, 255, 0.18);
      animation: clod-sidebar-pulse 2s ease-in-out infinite;
    }
    @keyframes clod-sidebar-pulse {
      0%, 100% { box-shadow: -10px 0 50px rgba(108, 99, 255, 0.55), inset 0 0 40px rgba(108, 99, 255, 0.18); }
      50%       { box-shadow: -14px 0 70px rgba(108, 99, 255, 0.85), inset 0 0 60px rgba(108, 99, 255, 0.30); }
    }
    #clod-welcome-logo {
      position: absolute;
      top: 50%;
      left: calc(50% - 220px);
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      filter: drop-shadow(0 0 24px rgba(108, 99, 255, 0.7))
              drop-shadow(0 0 60px rgba(108, 99, 255, 0.3));
      animation: clod-logo-appear 1s cubic-bezier(0.4, 0, 0.2, 1) 1s forwards;
    }
    @keyframes clod-logo-appear {
      from { opacity: 0; transform: translate(-50%, -42%) scale(0.92); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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
    #clod-nav-destination-prompt {
      position: fixed;
      top: 72px;
      left: 24px;
      width: 320px;
      background: rgba(17, 24, 39, 0.96);
      color: #f9fafb;
      border: 1px solid rgba(108, 99, 255, 0.45);
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      z-index: 2147483646;
      padding: 14px;
      display: none;
    }
    #clod-nav-destination-prompt.active {
      display: block;
    }
    #clod-nav-destination-prompt h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      line-height: 1.35;
    }
    #clod-nav-destination-prompt p {
      margin: 0 0 12px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #d1d5db;
    }
    #clod-nav-destination-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .clod-nav-destination-btn {
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .clod-nav-destination-btn.primary {
      background: #6c63ff;
      color: white;
    }
    .clod-nav-destination-btn.secondary {
      background: #374151;
      color: #f9fafb;
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

  function describeElement(el) {
    if (!el) return null;

    const className = el.className && typeof el.className === 'string'
      ? el.className.split(' ').filter(c => c.length > 2).slice(0, 3).join('.')
      : '';

    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classes: className || undefined,
      text: (el.textContent || '').trim().slice(0, 80) || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      type: el.getAttribute('type') || undefined
    };
  }

  function visibleInteractiveElements() {
    return Array.from(document.querySelectorAll([
      'button',
      'a[href]',
      'input',
      'textarea',
      '[role="button"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[aria-label]'
    ].join(', '))).filter(el => el.offsetParent || el.tagName === 'INPUT');
  }

  function findLocalElement(labels) {
    const normalizedLabels = labels.map(label => label.toLowerCase());
    return visibleInteractiveElements().find(el => {
      const haystack = [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('placeholder'),
        el.getAttribute('href'),
        el.id,
        typeof el.className === 'string' ? el.className : ''
      ].filter(Boolean).join(' ').toLowerCase();

      return normalizedLabels.some(label => haystack.includes(label));
    });
  }

  function localStep(message, el, explanation, extra = {}) {
    if (!el) return { message, steps: [] };
    return {
      message,
      steps: [{
        action: 'click',
        target: describeElement(el),
        explanation,
        ...extra
      }]
    };
  }

  async function getPendingGuideData() {
    const raw = await gmGetValue(PENDING_GUIDE_KEY, '');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function tryLocalClodGuide(userText) {
    const q = userText.toLowerCase();
    const onClod = location.hostname.includes('clod.io');
    if (!onClod) return null;

    const asksStart = /start|begin|get started|first|where.*click|怎么开始|从哪|开始|第一步/.test(q);
    const asksApiKey = /api\s*key|apikey|key|token|密钥|钥匙/.test(q);
    const asksModels = /model|models|deepseek|openai|anthropic|llama|模型/.test(q);
    const asksDocs = /doc|docs|documentation|api reference|文档|参考/.test(q);
    const asksPrice = /price|pricing|cost|free|credit|billing|费用|价格|免费|额度/.test(q);
    const asksEndpoint = /base url|endpoint|api url|request|curl|接口|地址/.test(q);

    if (asksEndpoint) {
      return {
        message: 'For CLōD API calls, use base URL https://api.clod.io/v1 and POST /chat/completions. This is OpenAI-compatible.',
        steps: []
      };
    }

    if (asksApiKey) {
      const el = location.hostname === 'clod.io'
        ? findLocalElement(['get api key', 'api keys', 'api key'])
        : findLocalElement(['api keys', 'api key', 'get api key']);
      const href = el?.getAttribute?.('href') || '';
      const isPublicSiteGetKey = location.hostname === 'clod.io' && href.includes('app.clod.io');

      return localStep(
        'You need an API key before calling CLōD. Click the API Keys area or the Get API Key button.',
        el,
        'Click here to create or view your CLōD API key.',
        isPublicSiteGetKey ? {
          pendingGuide: 'api-key',
          navigateAfterClick: href
        } : {}
      );
    }

    if (asksModels) {
      const el = findLocalElement(['models', 'deepseek', 'clōd hosted', 'clod hosted']);
      return localStep(
        'For this demo, use a CLōD Hosted model such as DeepSeek. It is the best fit for the CLōD prize track.',
        el,
        'Click here to browse available CLōD models.'
      );
    }

    if (asksDocs) {
      const el = findLocalElement(['docs', 'documentation', 'api reference']);
      return localStep(
        'The CLōD docs explain the OpenAI-compatible API, model names, routing strategies, and request format.',
        el,
        'Open the docs here.'
      );
    }

    if (asksPrice) {
      const el = findLocalElement(['billing', 'free', 'credit', '$']);
      return localStep(
        'CLōD offers free credits and daily free requests. Check billing or the credit area for your current balance.',
        el,
        'Click here to check credits or billing.'
      );
    }

    if (asksStart) {
      const el = findLocalElement(['get api key', 'api keys', 'models', 'studio', 'projects']);
      return localStep(
        'Start by getting an API key, then choose a CLōD Hosted model such as DeepSeek.',
        el,
        'This is the best first step on the CLōD site.'
      );
    }

    return null;
  }

  async function savePendingGuide(value) {
    if (!value) return;
    await gmSetValue(PENDING_GUIDE_KEY, JSON.stringify({
      value,
      originUrl: location.href,
      createdAt: Date.now()
    }));
  }

  async function consumePendingGuide() {
    const raw = await gmGetValue(PENDING_GUIDE_KEY, '');
    if (!raw) return null;

    await gmSetValue(PENDING_GUIDE_KEY, '');

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.createdAt || Date.now() - parsed.createdAt > 5 * 60 * 1000) return null;
      return parsed.value || null;
    } catch {
      return null;
    }
  }

  async function clearPendingGuide() {
    await gmSetValue(PENDING_GUIDE_KEY, '');
  }

  function removeDestinationChatCard() {
    document.getElementById('clod-nav-destination-card')?.remove();
  }

  function waitForAppUiReady() {
    if (location.hostname !== 'app.clod.io') {
      return Promise.resolve();
    }

    const isReady = () => {
      const apiKeys = findLocalElement(['api keys']);
      const models = findLocalElement(['models']);
      return Boolean(apiKeys && models);
    };

    if (isReady()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 15000);

      const observer = new MutationObserver(() => {
        if (isReady()) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    });
  }

  function resumeGuideByName(name) {
    if (name !== 'api-key') return false;

    const el = findLocalElement(['api keys', 'api key', 'get api key', 'key']);
    const result = localStep(
      'You are now in the CLōD app. Next, open API Keys to create or copy your key.',
      el,
      'Click API Keys here to manage your CLōD API key.'
    );

    addMessage('assistant', result.message);
    if (result.steps.length > 0) startStepGuide(result.steps);
    return true;
  }

  async function showDestinationChatCard() {
    removeDestinationChatCard();
    const pending = await getPendingGuideData();

    const continueGuide = async () => {
      pendingDestinationPromptShown = false;
      removeDestinationChatCard();
      await clearPendingGuide();
    };

    const goBack = async () => {
      pendingDestinationPromptShown = false;
      removeDestinationChatCard();
      await clearPendingGuide();
      if (pending?.originUrl) {
        window.location.href = pending.originUrl;
      } else {
        window.history.back();
      }
    };

    const card = addMessage('system', 'You are on the CLōD app page. Is this the page you wanted? If yes, continue. If not, go back to the original page.', {
      cardId: 'clod-nav-destination-card',
      actions: [
        { label: 'Yes, continue', kind: 'primary', onClick: continueGuide },
        { label: 'No, go back', kind: 'secondary', onClick: goBack }
      ]
    });
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  async function maybeShowDestinationPrompt() {
    if (pendingDestinationPromptShown) return;
    const pending = await getPendingGuideData();
    if (!pending?.value) return;
    if (location.hostname !== 'app.clod.io') return;

    await waitForAppUiReady();
    await new Promise((resolve) => setTimeout(resolve, 200));

    pendingDestinationPromptShown = true;
    resumeGuideByName(pending.value);
    setTimeout(() => {
      showDestinationChatCard().catch((err) => {
        console.warn('[CLōD Navigator] Failed to show destination card', err);
      });
    }, 900);
  }

  // ─── CLōD API Call ───────────────────────────────────────────────
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
1. Always respond in the JSON format above. No extra text, no reasoning, no analysis. Output ONLY the JSON object. Do NOT write anything before or after the JSON.
2. The "message" field must be a SHORT user-facing sentence (max 2 sentences). NEVER put your internal reasoning, analysis, or thought process in the message field. No "Wait", "Let me check", "Looking at", or similar phrases.
3. Use ONLY elements that exist in the provided list. Never invent elements.
4. If you can't find the right element, set steps to empty [] and explain in message.
5. Keep explanations warm and encouraging — like a patient friend helping a beginner.
6. For multi-step tasks, list steps in order. The UI will guide one step at a time.
7. If the user says something like "I did it!" or confirms a step, congratulate them.
8. For greetings or "how do I start?", point them to the most logical first action on the page.
9. JSON property names and string values must use double quotes. Do not use comments, trailing commas, or JavaScript expressions.
10. The "target" object in each step MUST match one of the elements from the INTERACTIVE ELEMENTS list. Copy the exact text/id/ariaLabel values — do not paraphrase.`;
  }

  function parseAssistantJson(raw) {
    let cleaned = String(raw || '').trim();

    // Strip DeepSeek R1 <think>...</think> blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip reasoning/thinking text BEFORE the JSON object
    // Models sometimes emit "Wait, I need to check..." or "Let me look at..." before the JSON
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      const preamble = cleaned.slice(0, firstBrace);
      if (/^[^{}"]*$/s.test(preamble)) {
        cleaned = cleaned.slice(firstBrace);
      }
    }

    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    // Find the outermost JSON object using bracket matching
    cleaned = extractJsonObject(cleaned);

    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    try {
      const parsed = JSON.parse(cleaned);
      const message = typeof parsed.message === 'string' ? parsed.message : 'I found a possible next step.';
      const steps = Array.isArray(parsed.steps) ? parsed.steps : [];

      // Detect reasoning leak: model put its internal analysis in the message field
      const looksLikeReasoning = message.length > 300
        || /\b(idx \d|the user is asking|looking at the|current page context|let me check|I need to check|wait,? I|checking the|I should|the elements? (?:list|array)|target object|let me (?:look|find|see)|analyzing|based on the)\b/i.test(message);

      return {
        message: looksLikeReasoning
          ? (steps.length > 0 ? 'Here, let me show you! Follow the highlighted steps.' : 'Let me find the right element for you — try asking more specifically.')
          : message,
        steps
      };
    } catch (err) {
      console.warn('[CLōD Navigator] Could not parse model JSON:', raw, err);
      // Fallback: try to extract "message" and "steps" from raw text
      const msgMatch = raw.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      let fallbackSteps = [];
      try {
        const stepsMatch = raw.match(/"steps"\s*:\s*(\[\s*\{[\s\S]*?\])/)
        if (stepsMatch) fallbackSteps = JSON.parse(stepsMatch[1].replace(/,\s*([}\]])/g, '$1'));
      } catch (_) {}

      if (msgMatch) {
        return { message: msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), steps: fallbackSteps };
      }
      return {
        message: 'I received a response, but could not turn it into page guidance. Try asking with simpler words like "where do I start?"',
        steps: fallbackSteps
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
    const localResult = tryLocalClodGuide(userText);
    if (localResult) return localResult;

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
      highlightedEl.classList.remove('clod-nav-target-active');
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
      arrow.textContent = '👇';
      arrow.style.top = `${Math.max(8, rect.top - 48)}px`;
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
      el.classList.add('clod-nav-target-active');
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

      // Listen for the user's click on the target
      const clickHandler = async (event) => {
        targetEl.removeEventListener('click', clickHandler);

        if (step.pendingGuide && step.navigateAfterClick) {
          event.preventDefault();
          await savePendingGuide(step.pendingGuide);
          window.location.href = step.navigateAfterClick;
          return;
        }

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
  function addMessage(role, text, options = {}) {
    const container = document.getElementById('clod-nav-messages');
    const msg = document.createElement('div');
    msg.className = `clod-msg ${role}`;
    if (options.cardId) msg.id = options.cardId;
    if (options.cardId) msg.classList.add('card');
    msg.textContent = text;

    if (Array.isArray(options.actions) && options.actions.length > 0) {
      const actions = document.createElement('div');
      actions.className = 'clod-msg-actions';

      for (const action of options.actions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `clod-msg-action-btn ${action.kind === 'secondary' ? 'secondary' : 'primary'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await action.onClick?.();
          } finally {
            btn.disabled = false;
          }
        });
        actions.appendChild(btn);
      }

      msg.textContent = text;
      msg.appendChild(actions);
    }

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
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
      chatHistory.push({ role: 'assistant', content: JSON.stringify(result) });
      if (chatHistory.length > MAX_HISTORY) chatHistory = chatHistory.slice(-MAX_HISTORY);
      saveChatHistory();

      if (result.steps && result.steps.length > 0) {
        addMessage('system', `📍 ${result.steps.length} step${result.steps.length > 1 ? 's' : ''} to guide you — watch for the spotlight!`);
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

    // Overlay click: forward click to highlighted element if within bounds, otherwise dismiss
    overlay.addEventListener('click', (e) => {
      if (highlightedEl) {
        const rect = highlightedEl.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          highlightedEl.click();
          return;
        }
      }
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

    showWelcomeEffect();
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

    maybeShowDestinationPrompt()
      .catch((err) => console.warn('[CLōD Navigator] Failed to show destination prompt', err));
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
        parsed.forEach(msg => {
          if (msg.role === 'assistant') {
            // History stores full JSON result — extract just the message for display
            try {
              const result = JSON.parse(msg.content);
              addMessage(msg.role, result.message || msg.content);
            } catch (_) {
              addMessage(msg.role, msg.content);
            }
          } else {
            addMessage(msg.role, msg.content);
          }
        });
        return true;
      }
    } catch (_) {}
    return false;
  }

  function showWelcome() {
    addMessage('assistant', "Hi! 👋 I'm your CLōD Navigator. I can help you find any button, input, or feature on this page. Just describe what you want to do in plain language!");
    addMessage('system', '💡 Try: "How do I start?" or "Where do I put my API key?"');
  }

  // ─── Welcome Effect ──────────────────────────────────────────────
  const WELCOME_SEEN_KEY = 'clod_navigator_welcomed';

  function showWelcomeEffect() {
    // Debug helper: call window.__clodResetWelcome() in DevTools to replay the effect
    // Full reset (clears storage + reloads) — for permanent reset
    unsafeWindow.__clodResetWelcome = () =>
      gmSetValue(WELCOME_SEEN_KEY, '').then(() => {
        sessionStorage.setItem('clod_nav_test_delay', '1');
        location.reload();
      });

    // Instant replay without reload — for demos: call __clodPreviewWelcome() or press Alt+Shift+W
    unsafeWindow.__clodPreviewWelcome = _runWelcomeEffect;
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyW') _runWelcomeEffect();
    });

    const delay = sessionStorage.getItem('clod_nav_test_delay') ? 1500 : 0;
    sessionStorage.removeItem('clod_nav_test_delay');

    gmGetValue(WELCOME_SEEN_KEY, '')
      .then(seen => { if (!seen) setTimeout(_runWelcomeEffect, delay); })
      .catch(() => { if (!localStorage.getItem(WELCOME_SEEN_KEY)) setTimeout(_runWelcomeEffect, delay); });
  }

  function _runWelcomeEffect() {
    gmSetValue(WELCOME_SEEN_KEY, '1').catch(() => localStorage.setItem(WELCOME_SEEN_KEY, '1'));

    const overlay = document.createElement('div');
    overlay.id = 'clod-welcome-overlay';

    const sheen = document.createElement('div');
    sheen.id = 'clod-welcome-sheen';
    overlay.appendChild(sheen);

    const symbols = ['•', '◇', '✦', '◦', '✧', '◈', '⊙', '∘'];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const orb = document.createElement('div');
      orb.className = 'clod-welcome-orb';
      orb.textContent = symbols[i % symbols.length];
      orb.style.top = `${4 + (i / count) * 92}%`;
      orb.style.fontSize = `${9 + (i % 4) * 6}px`;
      orb.style.animationDelay = `${(i / count) * 2.4}s`;
      orb.style.animationDuration = `${2.4 + (i % 5) * 0.4}s`;
      overlay.appendChild(orb);
    }

    const logo = document.createElement('div');
    logo.id = 'clod-welcome-logo';
    logo.innerHTML = `<svg width="440" height="290" viewBox="0 0 440 290" xmlns="http://www.w3.org/2000/svg">
      <!-- Cloud body -->
      <ellipse cx="220" cy="205" rx="182" ry="72" fill="white"/>
      <!-- Left side bump -->
      <circle cx="58"  cy="198" r="64" fill="white"/>
      <!-- Right side bump -->
      <circle cx="382" cy="198" r="64" fill="white"/>
      <!-- Top-left large bump -->
      <circle cx="148" cy="128" r="84" fill="white"/>
      <!-- Top-right large bump -->
      <circle cx="292" cy="112" r="90" fill="white"/>
      <!-- Bottom centre fill -->
      <circle cx="220" cy="248" r="52" fill="white"/>
      <!-- Text -->
      <text x="222" y="130" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia,'Times New Roman',serif"
        font-weight="700" font-style="italic" font-size="66" fill="#0d0d1a">Chat</text>
      <text x="222" y="196" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia,'Times New Roman',serif"
        font-weight="700" font-style="italic" font-size="66" fill="#0d0d1a">WithMe</text>
    </svg>`;
    overlay.appendChild(logo);

    document.body.appendChild(overlay);

    const glow = document.createElement('div');
    glow.id = 'clod-welcome-sidebar-glow';
    document.body.appendChild(glow);

    const logoFadeTimer = setTimeout(() => {
      logo.style.animation = 'none';         // cancel forwards-fill so inline styles take effect
      logo.style.transition = 'none';
      logo.style.opacity = '1';              // lock in visible state
      logo.getBoundingClientRect();          // force reflow
      logo.style.transition = 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)';
      logo.style.opacity = '0';
    }, 3700);

    function dismiss() {
      overlay.removeEventListener('click', dismiss);
      clearTimeout(autoTimer);
      clearTimeout(logoFadeTimer);
      overlay.style.transition = 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)';
      overlay.style.opacity = '0';
      glow.style.transition = 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)';
      glow.style.opacity = '0';
      setTimeout(() => { overlay.remove(); glow.remove(); }, 860);
    }

    overlay.addEventListener('click', dismiss);
    const autoTimer = setTimeout(dismiss, 4200);
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

    // Wait for body to exist (Chrome MV3 timing can be different from Safari)
    if (!document.body) {
      console.log('[CLōD Navigator] No body yet, setting up MutationObserver...');
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          console.log('[CLōD Navigator] Body appeared via observer, calling buildUI()');
          buildUI();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      return;
    }
  }

  init();
})();
