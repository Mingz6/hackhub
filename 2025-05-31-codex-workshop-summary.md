# Codex Workshop — Kai (Codex Ambassador Vancouver)

**Date:** 2025-05-31, 11:03 AM
**Duration:** 22 minutes
**Location:** CozyLab, Vibe Coding Hackathon
**Transcription:** whisper-cpp large-v3, VAD enabled

---

## Summary

Workshop covering OpenAI Codex setup, usage patterns, and advanced concepts for the hackathon participants. Kai walked through the progression from code-complete to autonomous agents, setup options, context management, and practical use cases.

## Key Concepts

### AI Model Landscape (Intro)
- GPT-5.5, Baud, Muse, Kimi scoring well on intelligence benchmarks with high token usage
- GPT-5.4 and 5 strong without reasoning (token-efficient)
- Gemma 4 (31B model) surprisingly competitive

### Codex Setup
Three ways to use:
1. **CLI** — recommended for Linux, lightweight
2. **Codex App** — desktop app for Windows/Mac
3. **IDE integration** — VS Code plugin, integrated file editing

⚠️ Watch out for fake Codex downloads via Google Ads — always use official OpenAI source.

### agents.md — The Map
- Core instruction file that tells the agent how to update your codebase, run code, etc.
- Acts as a "map" pointing at the most important parts
- Can ask Codex to update these files as you go
- Supports subfolder-specific overrides

### Context Management
- Context window holds ~400–600 pages
- Automatically compacted (summarized) after a while
- Long conversations → context drop/confusion
- **Start a new conversation** when things go off the rails
- Key principle: **Build the perfect context, not the perfect prompt**

### Delegation Philosophy
- Stay engaged — don't totally remove yourself from the process
- You need to learn and think about what makes a successful product
- "Faster validation means better outcomes" — get test signals early

## Use Cases Covered

1. **Learning a codebase** — especially helpful for reading someone else's code
2. **Building plans** — use `/plan` mode (Shift+App or `/plan`) for structured planning
3. **Investigating changes** — before implementing, have it analyze
4. **Error diagnosis** — feed error logs, get root cause + suggested fix
5. **Code review** — regular reviews to keep quality high
6. **Documentation** — helpful for agents, users, and future-you
7. **Writing tests** — good at unit tests, but review them (sometimes too easy to pass)

## Advanced Tips

### Standardized Behavior with Configs
Keep in your repo:
- `agents.md` — agent instructions
- To-do list (markdown, managed by agent)
- Documentation (agent-maintained)
- QA log
- Issue tracker

### Skills & Plugins
- **Skill** = a single instruction file
- **Plugin** = full bundle with scripts
- Invoke with `/skill-name` or mention in plain language
- Build skills for tasks requiring access/structure agents don't naturally have
- Good for: CLI/API connections, internal workflow rules, compliance tagging

### MCP (Model Context Protocol)
- Connect to external tools (GitHub, Jira, etc.) without going through their interfaces
- Desktop app support improved significantly

### Test-Driven Development Pattern
- Define success deterministically (write the test)
- Faster iteration loops = better outcomes
- Having simple tests >> having no tests
- Tests help catch breakages during updates (which will happen a lot)

## Workflow Diagram (from workshop)

```
Prompt → Inference → Tool Calls (code execution) → Loop until satisfied → Response
```

## Quotes Worth Keeping

> "Start by building the perfect context, not the perfect prompt." — Kai

> "If you're vibe coding, you want to make sure you're actually engaging with the process at every step." — Kai

> "Having simple tests is a lot better than having none." — Kai

## Action Items

- [ ] Set up `agents.md` in hackhub repo
- [ ] Try `/plan` mode for structured prompting
- [ ] Add a to-do.md managed by the coding agent
- [ ] Explore skill creation for repeated workflows
