# CLōD API Cheat Sheet — Hackathon Quick Reference

> One API key → 50+ models. OpenAI-compatible. Up to 60% cheaper.

## Essentials

| Item | Value |
|------|-------|
| Base URL | `https://api.clod.io/v1` |
| Endpoint | `POST /v1/chat/completions` |
| Auth | `Authorization: Bearer YOUR_CLOD_API_KEY` |
| Docs | https://clod.io/docs |
| API Reference | https://clod.io/docs/api-reference |
| Models list | https://app.clod.io/auth/models |
| Sign up | https://app.clod.io/ |
| Discord | https://discord.com/invite/BzG9yjKSmj |

## Free Tier (Hackathon)

- $20 free credits (hackathon participants, never expires)
- 100 free API requests/day (auto-replenished)
- 8 free open-source models on free tier
- Pay-as-you-go unlocks all 50+ models
- 50% credit match for new users (up to $25 free, applied within 24h)

## Request Body Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `model` | string | Yes | Model name, e.g. `"GPT 4o"` or with strategy `"GPT 4o@price"` |
| `messages` | array | Yes | Array of `{role, content}` objects |
| `temperature` | number | No | 0–2 range |
| `max_completion_tokens` | integer | No | Max tokens to generate |
| `stream` | boolean | No | Enable streaming (default: false) |

## Routing Strategies

Append to model name with `@`:

| Strategy | Effect |
|----------|--------|
| `@price` | Route to cheapest available instance |
| `@latency` | Route to fastest available instance |
| `@quality` | Route to highest-quality instance |

Example: `"GPT 4o@price"` or `"DeepSeek V3@latency"`

## Models for AI Jury Project

```python
MODELS = [
    "claude-sonnet-4-20250514",       # Anthropic — strong reasoning
    "gpt-4o",                          # OpenAI — creative, well-rounded
    "meta-llama/llama-3-70b",          # Meta — fast, open-source
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",  # Meta latest
    "DeepSeek V3",                     # DeepSeek — strong coder
]
```

## Python — httpx (async, no SDK needed)

```python
import httpx
import asyncio
import os

CLOD_API_KEY = os.environ["CLOD_API_KEY"]
CLOD_BASE_URL = "https://api.clod.io/v1"

async def query_model(client: httpx.AsyncClient, model: str, question: str) -> dict:
    response = await client.post(
        f"{CLOD_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {CLOD_API_KEY}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": question}],
        },
    )
    response.raise_for_status()
    data = response.json()
    return {"model": model, "answer": data["choices"][0]["message"]["content"]}

async def multi_model_research(question: str, models: list[str]) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        tasks = [query_model(client, m, question) for m in models]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]
```

## Python — OpenAI SDK

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["CLOD_API_KEY"],
    base_url="https://api.clod.io/v1",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
```

## cURL

```bash
curl -X POST "https://api.clod.io/v1/chat/completions" \
  -H "Authorization: Bearer $CLOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "DeepSeek V3",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Synthesis Agent Pattern

After gathering multi-model responses, feed them to a synthesis model:

```python
async def synthesize(client: httpx.AsyncClient, question: str, results: list[dict]) -> str:
    model_answers = "\n\n".join(
        f"**{r['model']}**: {r['answer']}" for r in results
    )
    prompt = f"""You are a research synthesis agent. A user asked: "{question}"

Multiple AI models responded:

{model_answers}

Produce a consensus summary:
1. Where do models AGREE? (key points)
2. Where do they DISAGREE? (highlight differences)
3. Final recommendation based on the strongest arguments.

Be concise. Use bullet points."""

    response = await client.post(
        f"{CLOD_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {CLOD_API_KEY}"},
        json={
            "model": "claude-sonnet-4-20250514",
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
```

## FastAPI Endpoint Skeleton

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ResearchRequest(BaseModel):
    question: str
    models: list[str] | None = None

@app.post("/api/research")
async def research(req: ResearchRequest):
    models = req.models or ["claude-sonnet-4-20250514", "gpt-4o", "meta-llama/llama-3-70b"]
    results = await multi_model_research(req.question, models)
    async with httpx.AsyncClient(timeout=60) as client:
        synthesis = await synthesize(client, req.question, results)
    return {"question": req.question, "results": results, "synthesis": synthesis}
```

## Prize Scoring Reminder

| Criteria | Weight | How to Win |
|----------|--------|------------|
| Platform Usage | 40% | Multiple models per query — show CLōD's multi-model value |
| Creativity | 25% | "AI Jury" consensus pattern is novel |
| Technical Execution | 20% | Async parallel calls, clean UI, error handling |
| Project Demo | 15% | Live query → visual comparison → synthesis |

## Environment Setup

```bash
export CLOD_API_KEY="your_key_here"
pip install httpx fastapi uvicorn
# or: pip install openai fastapi uvicorn
```

## Gotchas

- Model names are case-sensitive and may include slashes (e.g. `meta-llama/llama-3-70b`)
- Free tier: 100 requests/day — plenty for demo, be mindful during dev/testing
- Timeout: set 30s+ for larger models (Claude, GPT-4o can be slower)
- Response format is identical to OpenAI — `response["choices"][0]["message"]["content"]`
- Streaming uses same SSE format as OpenAI (`stream: true`)
