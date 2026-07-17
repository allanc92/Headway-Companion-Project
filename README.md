# The Intention Engine

A working prototype of a reimagined patient-intake experience for
[Headway](https://headway.co) — a conversational front door that moves a person from
raw, unstructured feeling (*"something changed in my relationship, and I need to talk to
someone"*) to a provider choice that feels **understandable, credible, and entirely
theirs**.

It replaces the cold clinical intake form with a supportive, AI-guided conversation, then
lets the patient **co-author** their own matching criteria instead of trusting a black
box. Built as a design + engineering artifact for a Headway product interview.

> **Not affiliated with, or endorsed by, Headway.** This is a good-faith interview
> prototype that recreates Headway's *design system* (layout, color, type, components)
> using original, copyright-safe assets — no lifted photography, illustrations, or
> licensed fonts. The wordmark is a simple recreation for demo purposes only.

---

## The idea in four laws

1. **Expression over taxonomy** — we meet the patient in their own words. The entry point
   is a quiet, natural-language conversation; the system does the work of translating
   context into matching criteria behind the scenes.
2. **Co-authored understanding** — no black-box matching. What the AI infers is surfaced
   as tactile, malleable **priority cards** the patient can rank, edit, or discard, each
   anchored to a phrase they actually said.
3. **Transparency is trust** — we replace filter sidebars with human **spectrums**
   (Action-oriented ↔ Space-holding) and surface real marketplace trade-offs. When
   criteria are too narrow, the UI shows the bottleneck and what adjusting it unlocks.
4. **Context is connection** — the intake becomes a persistent **Intention** artifact: it
   belongs to the patient, can be shared with a therapist if they choose, and stays an
   updatable compass for the patient.

A fifth, non-negotiable layer — **duty of care** — runs an always-on "Get help now"
affordance and a tiered crisis-detection model that raises a warm, resourced safety
overlay.

---

## The journey

```
Homepage (ZIP + insurance)  →  Conversation      →  Understanding     →  Matches           →  Intention
Headway-faithful anchor         Phase 1:             Phase 2:              Deterministic         Persistent artifact
captures hard filters           Expression           a summary you can     match carousel        the patient can
                                (AI speaks first)    shape by chatting     + honest trade-offs   choose to share
```

- **Homepage** — a faithful recreation of Headway's landing page. "Find care" captures
  **ZIP + insurance** (the deterministic hard filters) and transitions natively into the
  engine.
- **Conversation (Expression)** — the AI speaks first to break the blank-page freeze, then
  streams a warm, unhurried dialogue. Spark chips summon help rather than prefill answers.
- **Understanding** — Huey tells you it's gathering what it heard, then a held pause
  synthesizes the transcript into a single summary card: a short reflection, the priorities
  that matter most, and where you land on a few working-style spectrums.
- **Refine by chatting** — if anything feels off you just say so in the chat and Huey
  updates the summary (`POST /api/refine`); most people trust it and move on.
- **Matches** — deterministic matches appear as a horizontal carousel of therapist cards
  with availability-aware trade-offs and bottleneck surfacing.
- **Intention** — pick a provider; the living Intention is saved locally and framed as
  something the patient can bring to a first session if they choose.

---

## Tech stack

- **Next.js (App Router) + TypeScript** — [`next@16`](https://nextjs.org)
- **Tailwind CSS v4** — calm, minimal design system recreated from Headway
- **Vercel AI SDK** (`ai`) + **`@ai-sdk/azure`** — Azure OpenAI, streaming + structured output
- **Framer Motion** — held-pause, crystallization, card reordering
- **Zod** — schemas for structured LLM output (synthesis cards, safety tiers)
- **localStorage** — Intention persistence (no DB, no auth)

### Where the LLM is used

The LLM handles *language and understanding*; deterministic code handles *marketplace math*.

| Touchpoint | Route | Method |
| --- | --- | --- |
| Companion conversation | `POST /api/chat` | streamed `streamText` |
| Safety classification | `POST /api/safety` | `generateObject` + Zod (`tier 0–3`) |
| Understanding / synthesis | `POST /api/synthesize` | `generateObject` + Zod (reflection + cards) |
| Summary refinement | `POST /api/refine` | `generateObject` + Zod (revised summary + acknowledgment) |
| Match explanations | `POST /api/match` | deterministic scoring + LLM "why this fits" blurbs |

Provider scoring lives in `lib/providers.ts`: **hard filters** (insurance + ZIP→state /
telehealth) then a **soft score** over focus-area overlap, spectrum similarity, and an
availability bonus that gently distributes demand across the network.

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

**It runs with no configuration.** Without Azure credentials the app uses a graceful,
scripted fallback for every AI touchpoint, so the entire journey is demo-able offline. Add
credentials to unlock the live, LLM-powered experience.

### Enable the live LLM (Azure OpenAI)

Copy the example env file and fill in your Azure OpenAI resource details:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `AZURE_RESOURCE_NAME` | Your resource name (the part before `.openai.azure.com`) |
| `AZURE_API_KEY` | The resource API key |
| `AZURE_DEPLOYMENT_NAME` | The deployment you created (e.g. `gpt-4o`, `gpt-4o-mini`) |
| `AZURE_API_VERSION` | e.g. `2024-10-21` |
| `AZURE_USE_V1_API` | *(optional)* `true` to use the newer `/openai/v1` API instead of classic deployment URLs |
| `AZURE_BASE_URL` | *(optional)* full base URL instead of `AZURE_RESOURCE_NAME` |

Restart `npm run dev` after editing `.env.local`. `.env.local` is gitignored — never commit
real keys.

---

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fallanc92%2FHeadway-Companion-Project%2Ftree%2Fallanc92-intention-engine&env=AZURE_RESOURCE_NAME,AZURE_API_KEY,AZURE_DEPLOYMENT_NAME,AZURE_API_VERSION&envDescription=Azure%20OpenAI%20credentials%20(optional%20%E2%80%94%20the%20app%20runs%20in%20fallback%20mode%20without%20them))

The button above imports this branch and prompts for the Azure variables (leave them blank
to deploy in fallback mode). Or do it manually:

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add the `AZURE_*` variables above under **Project → Settings → Environment Variables**
   (they are stored encrypted and never live in the repo). Skip this to deploy in fallback
   mode.
3. Deploy. Vercel auto-detects Next.js — no extra configuration needed.

```bash
npm run build   # verify a production build locally first
```

---

## Project structure

```
app/
  page.tsx              Headway homepage anchor (ZIP + insurance)
  intake/page.tsx       The Intention Engine experience
  api/{chat,safety,synthesize,refine,match}/route.ts
components/
  home/                 Wordmark, header, find-care form, hero art
  intake/               Conversation, understanding summary, therapist carousel, results, artifact
  ui/                   Icons
lib/
  azure.ts              Azure OpenAI provider + credential gating
  prompts.ts            System prompts (the four laws, encoded)
  providers.ts          14 mock providers + deterministic matching + bottleneck engine
  fallback.ts           Offline scripted responses (runs without API keys)
  intention-store.ts    localStorage persistence
  copy.ts, types.ts
```

---

## Scope & disclaimers

**In scope (prototype):** the end-to-end intake experience, live or fallback AI, deterministic
matching over mock data, tiered safety UX, and a persistent Intention.

**Out of scope:** real auth, real provider data or booking, a database, and — importantly —
production clinical sign-off of the safety model. The crisis-detection layer shown here is a
**design prototype** and is labeled in-app as requiring clinical review before real-world use.
