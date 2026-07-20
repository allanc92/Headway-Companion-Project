# Changelog

Notable product and engineering changes to The Intention Engine are documented
here.

Entries are written from customer impact outward. Technical details are included
when they explain a meaningful product decision, trust boundary, or reliability
improvement.

> **Prototype status:** This is an unofficial, non-clinical prototype. No
> versioned release has been tagged, so historical work is grouped as an initial
> prototype rather than assigned a release number retroactively.

## Unreleased

- Added a spacious browser-local care home after simulated booking, carrying the
  existing Intention, fictional provider choice, simulated session, shared
  priorities, and onboarding itinerary into a responsive `/portal` route.
- Kept the portal's billing, benefits, patient files, notes, and Huey dock honest
  and bounded: no eligibility or payment claims, no new persisted care model,
  and no second chat backend.
- Added an opt-in, always-listening conversation mode using direct Azure
  Realtime WebRTC, server voice activity detection, interruption, and live
  captions in the same transcript as text chat. Typing remains unavailable
  until the call ends, and bounded connection recovery falls back quietly to
  text.
- Kept raw voice media out of the application server and storage: a short-lived
  client secret is minted server-side, the resource key remains private, and
  browser audio tracks are released at call end. Voice remains off by default
  and retains the prototype’s existing non-clinical safety and readiness gates.
- Unified the voice button, session endpoint, and opening invitation behind one
  server-side runtime capability so deployments never advertise a missing
  control or freeze voice availability into the browser bundle at build time.
- Kept transcription failures from masquerading as network failures, added a
  grace period for transient WebRTC disconnects, and only replenish the bounded
  reconnect budget after a session remains stable.

## Initial prototype - 2026-07-17

This milestone explores a care-discovery journey for people who may want therapy
but do not yet have precise language for what they need. It helps a person
reflect, turns that context into a user-owned summary, and explains illustrative
provider matches within explicit constraints.

### Customer journey

- Created a guided path from ZIP and insurance screening through onboarding,
  conversation, a synthesized understanding, illustrative provider matches,
  simulated scheduling, and a locally saved Intention.
  ([#1](https://github.com/allanc92/Headway-Companion-Project/pull/1),
  [#6](https://github.com/allanc92/Headway-Companion-Project/pull/6),
  [#9](https://github.com/allanc92/Headway-Companion-Project/pull/9))
- Introduced Huey as a warm, non-clinical companion, with varied live greetings
  and context-specific responses that help people begin without forcing them
  into a clinical taxonomy.
  ([#4](https://github.com/allanc92/Headway-Companion-Project/pull/4),
  [#8](https://github.com/allanc92/Headway-Companion-Project/pull/8),
  [#11](https://github.com/allanc92/Headway-Companion-Project/pull/11))
- Reworked conversation progression around the depth of what a person has
  shared, then added an explicit readiness check before turning that
  conversation into a summary.
  ([#2](https://github.com/allanc92/Headway-Companion-Project/pull/2),
  [#5](https://github.com/allanc92/Headway-Companion-Project/pull/5),
  [#15](https://github.com/allanc92/Headway-Companion-Project/pull/15))
- Let people correct the synthesized understanding through conversation and
  clarified that the resulting Intention belongs to them and is theirs to bring
  into care if they choose.
  ([#7](https://github.com/allanc92/Headway-Companion-Project/pull/7),
  [#9](https://github.com/allanc92/Headway-Companion-Project/pull/9))
- Refined the experience around a calmer opening state, clearer onboarding,
  more legible therapist browsing, a warmer visual system, and contextual
  guidance for the primary Find Care action.
  ([#6](https://github.com/allanc92/Headway-Companion-Project/pull/6),
  [#7](https://github.com/allanc92/Headway-Companion-Project/pull/7),
  [#9](https://github.com/allanc92/Headway-Companion-Project/pull/9),
  [#14](https://github.com/allanc92/Headway-Companion-Project/pull/14),
  [#16](https://github.com/allanc92/Headway-Companion-Project/pull/16))

### Safety and trust

- Added an always-available Get Help Now affordance and tiered prototype safety
  classification on each user turn, then integrated crisis resources into
  Huey's response so support remains prominent without breaking conversational
  continuity.
  ([#1](https://github.com/allanc92/Headway-Companion-Project/pull/1),
  [#13](https://github.com/allanc92/Headway-Companion-Project/pull/13))
- Prevented the experience from advancing to synthesis while a safety check is
  unresolved and strengthened transition backstops to consider cumulative
  substance rather than raw message count.
  ([#12](https://github.com/allanc92/Headway-Companion-Project/pull/12))

These safeguards are prototype behavior, use US crisis resources, and have not
received production clinical validation.

### Engineering foundations

- Kept language and understanding in the AI layer while making provider
  filtering, scoring, availability, and trade-offs deterministic and
  inspectable. The app can run end to end through scripted fallbacks when Azure
  OpenAI is unavailable.
  ([#1](https://github.com/allanc92/Headway-Companion-Project/pull/1))
- Hardened model-guided phase transitions with explicit signals, deterministic
  safety nets, concurrent safety-check gating, exact starter-signal matching,
  and more reliable fallback parsing.
  ([#2](https://github.com/allanc92/Headway-Companion-Project/pull/2),
  [#9](https://github.com/allanc92/Headway-Companion-Project/pull/9),
  [#12](https://github.com/allanc92/Headway-Companion-Project/pull/12))
- Added Vercel Web Analytics to the deployed application.
  ([#10](https://github.com/allanc92/Headway-Companion-Project/pull/10))

### Fixed

- Restored the Next.js runtime on Vercel so application and API routes no longer
  return 404 responses after deployment.
  ([#3](https://github.com/allanc92/Headway-Companion-Project/pull/3))

## Editorial policy

- Lead with the customer problem or outcome, not the implementation.
- Clearly distinguish implemented, simulated, and aspirational capabilities.
- Include technical detail when it materially affects safety, trust,
  reliability, performance, or an important product trade-off.
- Link each entry to its pull request for traceability.
- Omit internal-only work unless it changes one of those customer-relevant
  qualities.
- Move `Unreleased` entries into a dated version only when that version is
  tagged.
