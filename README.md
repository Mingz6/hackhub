# CLōD Navigator — AI Beginner Page Guide

> "Don't make me think." — A Tampermonkey userscript that guides AI beginners through the CLōD/Codex interface with spotlight highlights and step-by-step instructions.

## The Problem

80% of people give up in the first minute when they see a complex AI platform interface — English text, API endpoints, weird parameters. They want to use AI but don't know where to start.

## The Solution

CLōD Navigator is a floating sidebar that lets beginners ask questions in plain language. The AI identifies the exact button/input they need and spotlights it with a glowing highlight, dimmed background, and animated arrow.

## Features

- **Minimal Chat Sidebar** — One input box. Ask anything in plain language.
- **Spotlight Mode** — Page dims, target element glows with animated ring and bouncing arrow.
- **Step-by-Step Guarding** — Multi-step operations guided sequentially. Waits for your click before showing the next step.
- **Positive Feedback** — Confetti celebration on success. Encouragement when things go wrong.
- **Fast CLōD Rules** — Common CLōD questions are answered locally first, avoiding slow model calls during the demo.
- **Powered by CLōD API** — Uses CLōD's unified API with DeepSeek V3/model fallback for fast, cheap responses.

## Demo Flow

1. Install the userscript in Tampermonkey
2. Navigate to [app.clod.io](https://app.clod.io)
3. Enter your CLōD API key when prompted
4. Type "How do I get started?" — watch the magic happen

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click the raw `.user.js` file or create a new userscript
3. Paste the contents of `clod-navigator.user.js`
4. Navigate to `https://app.clod.io` — the sidebar appears automatically

## Tech Stack

- Vanilla JavaScript (Tampermonkey userscript)
- CLōD API (OpenAI-compatible, DeepSeek V3 with fallback routing)
- DOM introspection for page context extraction
- CSS animations for spotlight/confetti effects

## How It Works

1. Extracts all interactive elements (buttons, inputs, links) from the current page
2. Checks local CLōD-specific rules for common demo questions
3. Sends the page context + user's question to CLōD API only when local rules do not match
4. AI identifies which element(s) the user needs and returns structured steps
5. UI spotlights the target element with a dimmed overlay and animated indicators
6. Listens for user's click, then advances to the next step

## Team

- **Ming** — Architecture, full-stack implementation
- **Andrew-Anqi** — Product design, UX/UI spec

## Hackathon

Built for the HackHub Hackathon (May 31, 2026). Targeting:

- CLōD Best Use ($500 credit)
- General Top 3

## License

MIT
