# Hackathon Demo Prep - Vibe Coding Hackathon Vancouver

**Date:** May 31, 2026  
**Submission:** 4:00 PM  
**Theme:** Your Second Brain  
**Project:** CLōD Navigator  

---

## Current Direction

We are discarding the earlier React/web-app discussion. The MVP is a Tampermonkey userscript that behaves like a lightweight browser plugin.

The goal is to prove the core interaction quickly:

> A beginner asks what to do, and the current webpage visually points to the exact place they should click.

This keeps the build focused on a real demo instead of a full extension release process.

---

## Theme Fit: Your Second Brain

The event theme is to build AI that helps people remember, learn, reason, and act with knowledge they already have.

CLōD Navigator fits the theme as an action layer for learning unfamiliar tools:

- It helps beginners learn complex software interfaces in context
- It remembers common beginner questions and maps them to UI actions
- It helps users reason less about confusing page layouts and act faster
- It turns documentation-style knowledge into real-time visual guidance

Instead of asking users to read instructions, the product shows the next action directly on the page.

---

## The 3 Demo Points

### 1. Problem

**Beginners do not fail because AI tools are impossible. They fail because the first screen is confusing.**

Complex AI tools have sidebars, settings, API keys, input boxes, model selectors, and unfamiliar English labels. A non-technical user may give up before they even type the first prompt.

**Demo hook:** "Chatbots tell you what to do. CLōD Navigator shows you where to click."

### 2. Demo

**CLōD Navigator**

A Tampermonkey-powered browser guide that injects a small assistant sidebar into an existing webpage. The user asks a plain-language question, and the page highlights the correct button, input, or setting.

**Live demo flow, 90 seconds:**

1. Open the target AI coding page.
2. Show that the page looks confusing for a beginner.
3. Type: "I do not know where to start."
4. The page darkens and the correct input or start button is spotlighted.
5. Show the short instruction: "Start here."
6. Click the highlighted target.
7. Show positive feedback and, if available, the next step.

**What judges see:**

- Real injected browser behavior through Tampermonkey
- A clear before/after contrast on the same webpage
- Visual guidance instead of text-only explanation
- A beginner-friendly workflow that can generalize to SaaS onboarding

### 3. Impact

**CLōD Navigator makes complex tools feel usable in the first minute.**

- **For beginners:** Know exactly where to click next
- **For AI tools:** Improve new-user activation
- **For SaaS companies:** Reduce onboarding friction and support tickets
- **For education:** Turn tutorials into live, contextual guidance

**One-liner:** "It is a second brain for software onboarding: ask what to do, and the page points the way."

---

## Judging Criteria Fit

| Criteria | How We Address It |
|---|---|
| Innovation | Visual, in-page guidance is more direct than a normal chatbot response. |
| Technical Execution | Tampermonkey script injects UI, scans page elements, matches intent, and renders overlays. |
| Usability | Designed for non-technical beginners with short instructions and one highlighted action at a time. |
| Problem Relevance | Helps people learn and act with unfamiliar AI tools, matching the "second brain" theme. |
| Bonus: Go-to-Market | Can become an onboarding layer for SaaS, AI tools, education platforms, and enterprise dashboards. |

---

## Technical Stack

```text
Runtime:    Tampermonkey userscript
Language:   Plain JavaScript
UI:         Injected HTML/CSS sidebar and overlay
Matching:   Keyword/rule-based intent matching for the MVP
Storage:    Optional local userscript state only
Deploy:     Local Tampermonkey install for live demo
```

No React app is required for this version. No Chrome Web Store publishing is required.

---

## Build Plan

| Time | Task | Deliverable |
|------|------|-------------|
| 10:30-11:00 | Pick target page and key user flows | Demo target locked |
| 11:00-12:00 | Create Tampermonkey userscript shell | Script runs on target page |
| 12:00-12:30 | Build right-side assistant sidebar | User can type a request |
| 12:30-14:00 | Implement element detection and intent matching | Start/type/run/API-key flows work |
| 14:00-15:00 | Add overlay, spotlight, arrow, and click feedback | Main wow moment works |
| 15:00-15:30 | Rehearse two-minute pitch and record backup | Ready to present |
| 15:30-16:00 | Submit project and keep buffer | Submitted before 4:00 PM |

---

## MVP Flows

### Flow 1: Start

User says:

> I do not know where to start.

Guide:

1. Highlight the main prompt input or start button.
2. Show: "Start here."
3. Confirm when the user clicks or types.

### Flow 2: Type A Request

User says:

> Where do I type what I want?

Guide:

1. Highlight the main text area or prompt input.
2. Show: "Type your request here."

### Flow 3: Run

User says:

> How do I run it?

Guide:

1. Highlight the run, submit, send, or start button.
2. Show: "Click this button to run your request."

### Flow 4: API Key

User says:

> Where do I put the API key?

Guide:

1. Highlight an API key field if visible.
2. Otherwise highlight settings, account, developer, or API navigation.
3. Show: "An API key is like a password for connecting to an AI service. Paste it here."

---

## Demo Script

> "Hi, I'm Ming. I built CLōD Navigator, a Tampermonkey-powered browser guide for AI beginners."
>
> **Problem:** "Many people want to try AI tools, but they get stuck on the first screen because they do not know what to click."
>
> **Demo:** "Instead of explaining in a paragraph, CLōD Navigator points directly on the page. I type 'I do not know where to start,' and the page highlights the exact input or button I should use."
>
> **Impact:** "This can become an onboarding layer for AI tools and SaaS products. It helps users learn and act immediately, which fits today's theme: your second brain."

---

## Pre-Demo Checklist

- [ ] Tampermonkey installed
- [ ] Userscript installed and enabled
- [ ] Target page selected
- [ ] Sidebar appears on target page
- [ ] At least three beginner intents work
- [ ] Spotlight and arrow are visually clear
- [ ] Click feedback works
- [ ] Two-minute pitch rehearsed
- [ ] Backup screen recording prepared
- [ ] Project submitted before 4:00 PM
