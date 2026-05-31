# Claude Chrome Extension — Architecture Analysis

## How the Claude Chrome Extension Works

### Architecture (3 layers)

```
┌─────────────────────────────────────────────────┐
│  Claude API (cloud)                             │
│  - Receives screenshots + conversation          │
│  - Returns tool_use actions (click, type, etc.) │
└─────────────────────┬───────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────┐
│  Extension Background Service Worker            │
│  - Agent loop (screenshot → API → execute)      │
│  - Session/auth management                      │
│  - Tab group management                         │
│  - Scheduling (alarms API)                      │
└─────────────────────┬───────────────────────────┘
                      │ Chrome DevTools Protocol
┌─────────────────────▼───────────────────────────┐
│  Browser Tabs (content)                         │
│  - Screenshots captured via debugger API        │
│  - Clicks/typing dispatched via CDP             │
│  - DOM state read via scripting API             │
│  - Console logs captured via debugger           │
└─────────────────────────────────────────────────┘
```

### Key Technical Mechanisms

| Component | Chrome API Used | What It Does |
|-----------|----------------|--------------|
| Side panel UI | `sidePanel` | Chat interface that stays open while browsing |
| Browser control | `debugger` (Chrome DevTools Protocol) | Screenshots, click dispatch, typing, navigation |
| Page reading | `scripting` + content scripts | Read DOM, extract text, inject actions |
| Tab management | `tabs` + `tabGroups` | Open/close/switch tabs, organize into color-coded groups |
| Scheduling | `alarms` | Recurring workflows (daily, weekly) |
| Cross-app comms | `nativeMessaging` | Connect to Claude Desktop / Claude Code |
| Console capture | `debugger` (CDP `Runtime.consoleAPICalled`) | Read errors, network requests, DOM state |
| Screen awareness | `system.display` | Know screen dimensions for accurate click coordinates |

### The Agent Loop (core logic)

```
1. User gives instruction (or scheduled task fires)
2. Extension captures screenshot via CDP (Page.captureScreenshot)
3. Screenshot + conversation sent to Claude API with computer_use tool
4. Claude responds with tool_use: {action: "left_click", coordinate: [x, y]}
5. Extension executes action via CDP (Input.dispatchMouseEvent / Input.dispatchKeyEvent)
6. Wait briefly → capture new screenshot
7. Send result back to Claude
8. Repeat until Claude says "done" or hits iteration limit
```

### Permission Breakdown

The `debugger` permission is the magic — it gives full Chrome DevTools Protocol access without needing DevTools open:

- `Page.captureScreenshot` — pixel-perfect screenshots
- `Input.dispatchMouseEvent` — synthetic clicks at exact coordinates
- `Input.dispatchKeyEvent` — keyboard input
- `Runtime.evaluate` — execute JS in page context
- `Network.getResponseBody` — read network traffic
- `Console` domain — capture console output

Full permission list from their manifest:

| Permission | Why |
|------------|-----|
| `sidePanel` | Chat panel alongside browsing |
| `storage` | Save preferences |
| `scripting` | Read webpage text |
| `debugger` | Browser control (CDP) |
| `tabGroups` | Organize Claude's tabs separately |
| `tabs` | Open/close/switch tabs |
| `alarms` | Scheduled tasks |
| `notifications` | Alert user when done |
| `system.display` | Screen size for click accuracy |
| `webNavigation` | Detect high-risk sites |
| `declarativeNetRequestWithHostAccess` | Identify extension to Anthropic servers |
| `offscreen` | Play notification sounds |
| `nativeMessaging` | Connect to Claude Desktop/Code |
| `downloads` | Save files from workflows |
| `unlimitedStorage` | Store complex workflow instructions |

---

## Can You Build Something Similar?

**Yes.** The core tech is all accessible.

### Minimum Viable Implementation

1. **Chrome Extension (Manifest V3)** — side panel + background service worker
2. **CDP access via `debugger` permission** — for screenshots and input dispatch
3. **Any multimodal LLM with tool use** — Claude API, OpenAI GPT-4o, Gemini
4. **Agent loop** — the orchestration logic (~200 lines)

### Key Decisions

| Decision | Anthropic's Choice | Your Options |
|----------|-------------------|--------------|
| LLM | Claude API (computer_use tool) | Claude API, OpenAI, local models with vision |
| Browser control | `debugger` API (CDP) | Same, or Puppeteer/Playwright via native messaging |
| UI | Side panel | Side panel, popup, or separate window |
| Coordinate system | Screenshot → model returns pixels | Same pattern required for any vision-based approach |
| Auth | Anthropic account | Your own auth or API key input |

### Project Structure

```
my-browser-agent/
├── manifest.json          # MV3, permissions: sidePanel, debugger, tabs, scripting
├── background.js          # Service worker: agent loop, CDP commands
├── sidepanel.html/js      # Chat UI
├── lib/
│   ├── cdp.js             # CDP wrapper (screenshot, click, type, scroll)
│   ├── agent-loop.js      # Core loop: screenshot → LLM → action → repeat
│   └── llm-client.js      # API calls to Claude/OpenAI
└── content-script.js      # Optional: DOM reading, text extraction
```

### What's Hard (where Anthropic has an edge)

1. **Model quality** — Claude's computer use training data makes it very good at interpreting screenshots and deciding where to click. A generic vision model will be less reliable.
2. **Prompt injection defense** — They have classifiers that detect when web content tries to hijack the agent. You'd need to build this yourself.
3. **Coordinate scaling** — Retina displays (2x DPI) and API image size limits require careful math. Their model expects specific resolutions.
4. **Site-specific knowledge** — They've trained Claude to know Gmail, Slack, GitHub navigation patterns. Generic models won't have this.
5. **Workflow recording** — Their "record and replay" feature is a UX layer on top that captures user actions and converts them to replayable instructions.

### Code Skeleton

```typescript
// background.js — minimal agent loop
async function agentLoop(tabId: number, userPrompt: string) {
  const messages = [{ role: 'user', content: userPrompt }];
  
  for (let i = 0; i < 20; i++) {
    // 1. Capture screenshot
    const { data } = await chrome.debugger.sendCommand(
      { tabId }, 'Page.captureScreenshot', { format: 'png' }
    );
    
    // 2. Send to LLM with screenshot
    const response = await callClaude(messages, data);
    
    // 3. Check if done
    if (response.stop_reason === 'end_turn') break;
    
    // 4. Execute tool actions
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        await executeAction(tabId, block.input);
      }
    }
    
    // 5. Brief delay for page to settle
    await new Promise(r => setTimeout(r, 500));
  }
}

async function executeAction(tabId: number, input: any) {
  switch (input.action) {
    case 'left_click':
      const [x, y] = input.coordinate;
      await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', 
        { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', 
        { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      break;
    case 'type':
      for (const char of input.text) {
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent',
          { type: 'keyDown', text: char });
        await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent',
          { type: 'keyUp', text: char });
      }
      break;
    case 'screenshot':
      break; // handled at loop level
  }
}
```

### Cost Estimate

Each action cycle burns ~1-3K tokens (system prompt + screenshot image + response). A 10-step workflow ≈ 10-30K tokens total. At Claude Sonnet 4.6 rates, roughly $0.03-0.10 per workflow execution.

---

## References

- [Chrome Web Store listing](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
- [Computer Use API docs](https://platform.claude.com/docs/en/docs/agents-and-tools/computer-use)
- [Reference implementation (Docker)](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo)
- [Getting started guide](https://support.claude.com/en/articles/12012173-getting-started-with-claude-for-chrome)
