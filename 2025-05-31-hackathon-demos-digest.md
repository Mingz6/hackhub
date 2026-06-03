# Hackathon Demo Presentations — Full Video Digest

**Date:** 2025-05-31, ~4:00 PM  
**Duration:** 44 minutes (15.5 min real content + ambient noise)  
**Source:** iPhone spatial video recording (IMG_2036.MOV, 3.5GB)  
**Location:** CozyLab, Central Vancouver  
**Event:** HackHub Vibe Coding Hackathon — Theme: "Your Second Brain"  
**Processing:** whisper-cpp large-v3 + qwen2.5vl:7b vision + macOS OCR

---

## Event Context

One-day hackathon at CozyLab Vancouver. Teams had 8 hours to build AI tools around the theme "Your Second Brain" — AI that helps people remember, learn, reason, and act with knowledge they already have.

**Demo format:** 2 minutes per team, presented from their own laptops to a panel of 5 judges.

**Judging criteria:** Innovation, Technical Execution, Usability, Problem Relevance

## Judges Panel

| Judge | Role |
|-------|------|
| Kai | Prodax Ambassador / Codex Ambassador Vancouver |
| Steven | IT Expert & Consultant |
| Perminder | AI Engineer, Health Tech |
| Adam | Founder, AI Friendly |
| Jessica | CMO, INP Capital |

---

## Demo 1: Memorial (MemoRail)

**Timestamp:** 1:00–5:30  
**Team size:** 2 presenters  

### Problem
Existing tools (Obsidian, Notion) require manual input. Users forget tasks, miss follow-ups, lose context scattered across messages, calls, and emails.

### Solution
A pocket secretary that lives on your Mac and auto-ingests everything — messages, voice calls, notes, reminders, emails — then surfaces actionable tasks.

### Features Demonstrated
- **Auto-sync:** Scans voice calls, notes, emails → generates morning briefing with daily tasks
- **Loops:** Active task list (reminders, draft replies, send emails/messages)
- **Memory graph:** Tracks relationships and conversation context (e.g., friend Jenae → Shopify interview prep → prompts follow-up)
- **Context chatbot:** "What am I forgetting today?" → surfaces movie booking from iMessages at 7 PM

### Tech Stack
- Runs locally on macOS (accesses iMessages directly from Mac storage)
- Composio for Gmail integration
- Local LLM for inference

### Judge Q&A
> "How do you access all the data on the laptop?"  
> "It's stored on the Mac already for iMessages. For emails, we use Composio to connect to Gmail easily."

---

## Demo 2: Tim Chi (Novit — Make Connection, Have to Decide)

**Timestamp:** 5:30–8:30  
**Team size:** 2 presenters  

### Problem
You know things about your friends — food preferences, hobbies, neighborhoods — but it's hard to synthesize across multiple people when planning group activities.

### Solution
An AI knowledge base that tracks people you know. Builds profiles through conversational Q&A, then recommends activities based on combined preferences.

### Features Demonstrated
- AI chatbot asks progressive questions about a friend (what does he like? → Thai food → which restaurants? → Thaya Hot Downtown)
- Builds per-person preference profiles (loves/doesn't like)
- Group queries: "I want a spot downtown to hang out" → fetches preferences of selected friends → recommends matching venue

### Judge Q&A
> "What's the input?"  
> "Chat-based. The AI asks about your friend and generates more questions on related topics as you answer."

---

## Demo 3: LexMind

**Timestamp:** 8:30–13:00  
**Team size:** 1 presenter (Jack)  

### Problem
Lawyers spend 3+ years learning the law across IP, contractual, employment, and privacy domains. No human can remember every legal concept while managing dozens of active matters. A lawyer might walk into back-to-back meetings on completely different areas of law.

### Solution
AI-powered second brain for lawyers that connects to their calendar and auto-prepares briefings for every meeting using specialized AI agents.

### Architecture
- Calendar integration detects upcoming meetings
- Platform identifies relevant matter, documents, emails, legal resources
- Specialized AI agents (privacy law, employment law, IP law) collaboratively produce briefings
- Output: key facts, risks, precedents, templates, discussion points, suggested questions

### Differentiators
- **Proactive & real-time** — not just before/after meeting tools like contract review
- **Zero new UX to learn** — lawyers just check their calendar and read briefings
- **Scalable beyond law** — accountants, doctors, consultants, financial advisors

### Tagline
> "Law school teaches lawyers the law. LexMind ensures they remember all of it."

### Judge Q&A
> Dennis: "What technical problem do you solve?"  
> "Lawyers face multiple areas of law in a single day. This agent helps them prepare for each meeting in real-time with specialized context."

---

## Demo 4: Kogi Students

**Timestamp:** 13:00–15:30  
**Team size:** 2 presenters  

### Problem
Active learning through teaching is effective, but students rarely find receptive audiences who can identify their knowledge gaps.

### Solution
An AI that acts as a student you teach. It listens, asks probing questions, identifies gaps in your understanding, and checks correctness against learning objectives.

### Architecture — Three LLM Actors
1. **Converser:** Engages with the user in natural dialogue
2. **Fact-checker:** Verifies what the converser says is correct (prevents hallucination)
3. **Learning objectives checker:** Maps responses to curriculum requirements to assess sufficiency

### Demo
- Topic: mitosis → generates learning outcomes
- User says "mitosis is cell division" → AI verifies correctness → asks "what are the stages of mitosis?"
- Checks both coverage (did you cover all objectives?) and correctness (is what you said accurate?)

### Target Audience
High school students, university students, lifelong learners

### Next Steps
Voice function for real conversations

### Judge Q&A
> "Why three LLMs?"  
> "A single LLM loses focus — it doesn't always assess learning quality or sometimes hallucinates. Splitting responsibilities gives each agent full focus on its task."

---

## Demo 5: Directed AI (partial)

**Timestamp:** 15:30+  
**Introduced as:** "Chad with me in Directed AI"

MC announces the next team. Audio becomes ambient noise before the demo starts. Content not captured.

---

## Visual Observations (Frame Analysis)

| Time | Frame Content |
|------|---------------|
| 1:24 | "Happy Vibe Coding!" text on screen, countdown about to start |
| 2:55 | Memorial application interface visible on laptop (OCR partially obscured) |
| 4:25 | Audience watching — person with orange scrunchie in foreground, meeting room setting |
| 7:25 | Blue interface with icons visible on background screen (Novit demo) |
| 8:55 | Group presentation setting, no code/UI clearly visible in frame |
| 11:55 | Presenter with laptop, blue interface on background screen |
| 13:25 | Person holding laptop, explaining to audience (Kogi Students) |
| 14:55 | Screen shows CN Tower cityscape, event branding |
| 28:44 | "VIBE CODING HACKATHON" slide from HackHub with QR code, Vancouver |
| 42:06–43:36 | Post-demo socializing, casual networking |

---

## Cross-Reference with Voice Memos

This video covers the **judging/demo session** (4:00–4:45 PM). Related voice memos:
- [Opening ceremony](2025-05-31-hackathon-opening-summary.md) — 10:02 AM, schedule and sponsors
- [Pre-submission discussion](2025-05-31-pre-submission-summary.md) — 3:08 PM, cross-platform AI coding
- [Codex workshop](2025-05-31-codex-workshop-summary.md) — 11:00 AM, Codex/Devin tutorial

## Key Patterns Across All Demos

All four captured demos share common architecture choices:
1. **Local-first / privacy-aware** — Memorial runs on Mac, Kogi checks locally
2. **Multi-agent systems** — LexMind uses specialized law agents, Kogi uses 3 LLM actors
3. **Calendar/communication integration** — Memorial ingests all comms, LexMind connects to calendar
4. **Conversational UX** — Every demo uses chat as the primary interface
5. **"Second brain" = proactive surfacing** — Not just retrieval, but unprompted suggestions

---

*Generated by video-watcher pipeline: whisper-cli transcription (trimmed at 15:41 to remove hallucination on ambient noise) + qwen2.5vl frame vision + cross-verification against voice memo summaries.*
