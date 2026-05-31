# Hackathon Demo Prep — Vibe Coding Hackathon Vancouver

**Date:** May 31, 2026  
**Submission:** 4:00 PM  
**Target Prize:** CLōD Best Use ($500 credit) + General Top 3  

---

## The 3 Demo Points

### 1. PROBLEM

**"One AI model = one perspective. You're making decisions based on a single opinion."**

When you ask ChatGPT or Claude a question, you get ONE answer from ONE model. But different models have different strengths — Claude is better at reasoning, GPT at creativity, Llama at speed, Gemini at multimodal. For any important decision (research, analysis, technical design), relying on a single model is like asking one doctor when you should get a second opinion.

**Demo hook:** "Would you trust one Google result? Then why trust one AI answer?"

---

### 2. DEMO

**Multi-Model Research Agent — "AI Jury"**

A web app that takes your question, queries 3-4 models simultaneously via CLōD's unified API, then synthesizes a consensus answer highlighting where models agree and disagree.

**Live demo flow (90 seconds):**
1. Type a question (e.g., "What's the best Python web framework for a startup MVP in 2026?")
2. Show the query fanning out to 3+ models (Claude, GPT, Llama) via CLōD
3. Each model's response appears in its own card (side-by-side)
4. A synthesis agent (also via CLōD) produces a "consensus" summary
5. Highlight disagreements — "Claude says FastAPI, GPT says Next.js, Llama agrees with Claude"

**What judges see:**
- Real CLōD API calls (Platform Usage: 40% — this is 4+ calls per query, multiple models)
- Novel concept of "AI diversity" (Creativity: 25%)
- Clean code, working web UI (Technical Execution: 20%)
- Smooth live demo (Project Demo: 15%)

---

### 3. IMPACT

**"Better decisions through AI diversity."**

- **For researchers:** Get balanced perspectives instead of one model's bias
- **For developers:** Compare model outputs for code review, architecture decisions
- **For founders:** Validate ideas against multiple AI "advisors" before committing
- **Cost angle:** CLōD makes this affordable — one API key, 50+ models, up to 60% cheaper than going direct

**One-liner:** "It's like getting a second opinion — except you get five, instantly, for pennies."

---

## Why This Wins CLōD Prize

| Criteria (Weight) | How We Score |
|---|---|
| Platform Usage (40%) | Multiple models called per query. Shows CLōD's unique multi-model value prop. Not just one model — the whole point IS using many models. |
| Creativity (25%) | "AI Jury" / consensus pattern is novel. Most projects just call one model. |
| Technical Execution (20%) | Async parallel calls, streaming responses, clean UI. Built on proven pattern (DeepResearchAiMin). |
| Project Demo (15%) | Live query → visual multi-model comparison → synthesis. High visual impact. |

---

## Build Plan (5 hours)

| Time | Task | Deliverable |
|------|------|-------------|
| 10:30–11:00 | Set up CLōD API key, test 3 models work | `test_clod.py` passes |
| 11:00–12:00 | Backend: FastAPI + async multi-model query | `/api/research` endpoint works |
| 12:00–12:30 | Lunch (let ideas settle) | — |
| 12:30–14:00 | Frontend: React/HTML showing model cards + synthesis | UI renders results |
| 14:00–15:00 | Synthesis agent + polish (streaming, error handling) | End-to-end works |
| 15:00–15:30 | Demo script rehearsal, record backup video | Ready to present |
| 15:30–16:00 | Submit + buffer | Submitted |

---

## Tech Stack

```
Frontend:  HTML + Tailwind (or simple React if time allows)
Backend:   Python FastAPI (or Flask — you know Flask from DeepResearchAiMin)
LLM:       CLōD API (OpenAI-compatible endpoint)
Models:    3-4 from CLōD (e.g., claude-sonnet, gpt-4o, llama-3, gemini)
Deploy:    Local demo (no deploy needed for hackathon)
```

---

## CLōD API Quick Start

```python
import httpx
import asyncio

CLOD_API_KEY = "your_clod_key"  # $20 free credits
CLOD_BASE_URL = "https://api.clod.io/v1"  # Check docs: clod.io/docs

MODELS = [
    "claude-sonnet-4-20250514",
    "gpt-4o",
    "meta-llama/llama-3-70b",
]

async def query_model(client, model, question):
    response = await client.post(
        f"{CLOD_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {CLOD_API_KEY}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": question}],
        },
    )
    data = response.json()
    return {"model": model, "answer": data["choices"][0]["message"]["content"]}

async def multi_model_research(question):
    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [query_model(client, m, question) for m in MODELS]
        results = await asyncio.gather(*tasks)
    return results
```

---

## Demo Script (What to Say)

> "Hi, I'm Ming. I built **[Project Name]** — a multi-model research agent powered by CLōD."
>
> **PROBLEM:** "When you ask AI a question, you get one answer from one model. But different models think differently. That's like asking one person and calling it research."
>
> **DEMO:** "Watch — I type a question, and it queries Claude, GPT-4o, and Llama simultaneously through CLōD's unified API. Each model answers in its own card. Then a synthesis agent compares them and tells me where they agree and disagree."
>
> *[Live demo: type question, show results]*
>
> **IMPACT:** "Better decisions through AI diversity. And CLōD makes it affordable — one API, fifty models, fraction of the cost. This is the future of how we use AI: not one model, but many."

---

## Alternate Project Ideas (If Theme Doesn't Fit)

If the announced theme steers away from research tools, adapt the same multi-model architecture:

1. **AI Code Reviewer** — paste code, 3 models review it, synthesis highlights consensus bugs
2. **Startup Idea Validator** — describe idea, models play investor/customer/critic roles
3. **Study Buddy** — ask a study question, get explanations at different difficulty levels from different models
4. **AI Debate Club** — pick a topic, models argue different sides, you watch the debate

All of these use the same backend (parallel CLōD calls + synthesis). Just swap the prompts.

---

## Pre-Demo Checklist

- [ ] CLōD API key set up and working
- [ ] At least 3 models responding
- [ ] Web UI loads and shows results
- [ ] Synthesis/consensus step works
- [ ] Demo question prepared (something impressive)
- [ ] Backup: screen recording of working demo in case live fails
- [ ] Project submitted on platform before 4:00 PM
