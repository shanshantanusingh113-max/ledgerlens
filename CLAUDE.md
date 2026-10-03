# CLAUDE.md

LedgerLens: an AI copilot for Indian GST reconciliation, built for Fintechstico V7.0 (NSUT Consilium'26), problem statement 2. The demo must show one month of books reconciled end to end: every mismatch priced as ITC at risk or ITC found, each Finding explained with evidence, a Draft fix approved in one click, and a Supplier ring caught on the network view.

Vocabulary lives in CONTEXT.md. Use its terms in code, UI and docs.

## Status

- Stage: prototype round (shortlisted from the ideathon). Prototype video (2 to 2.5 minutes: problem, approach, demo) due 4 Oct 2026, 1:30 AM. Results about 3:00 AM. Final presentation on campus at NSUT Dwarka, 4 Oct 2026, 10:30 AM, with the working prototype and the deck. The plan is still to build the whole project.
- Ideathon deck: done (deck/, see deck/NOTES.md). Team details on slide 3 are still placeholders.
- Blueprint: complete. CONTEXT.md, this file, ML_BUILD.md, plan/00 to plan/06 and plan/schema.sql.
- Review feedback of 3 Oct 2026 is done (plan/05-build-plan.md, Review feedback): the user picked the bold direction (dark headline band, large display type, sections on a heavy rule instead of boxes; PRODUCT.md holds the brief), and it is applied to every screen. New since then: a full landing page at /, a live feed of real records during a Run with a Run log button, a Data page, the Proof page with misses by record and a whole-year switch, and the Ring view with Party detail, the money diagram and the year chart. Latest: the landing page was rebuilt on the dark void system from the style reference in Downloads/NSUT UI/DESIGN.md, with a canvas particle brain in the hero, scroll reveals, counting numbers and a theme button; every token now has a light value too. docs/DEMO_SCRIPT.md is written. The repo is at github.com/RAK2315/ledgerlens (private). The backend is hosted as a Hugging Face Docker Space (README.md, Hosted copy; deploy/hf-space holds the files); the frontend goes on Vercel from the user's account. Still open: the user's second test, quality passes, the answer_key liability test.
- Code: plan/05-build-plan.md phases 1 to 13 are built: ml package (matchers in ml/artifacts), backend (store, engine, Run pipeline, every API route, Drafts through Groq with disk cache and templates) and frontend (start, dashboard, Finding drawer with approve, edit and dismiss, workbench with One-to-many, ring view, liability, proof). Checked with Playwright at 1440x900 and 1920x1080 on the production build, no console errors (frontend/scripts/shots.mjs walks the journey). Run it with start.cmd after the one-time steps in README.md. The user tested it on 3 Oct 2026 and asked for a redesign (it looked AI-generated), one bug fix and four feature additions, all now built (line above). After that: quality passes, hosted deploy (Dockerfile and render.yaml are written but not tried), V2 features.
- Dataset: data/source/tax_recon_dataset.xlsx (SHA-256 in ML_BUILD.md 3.1). GSTR-2B lines and augment labels are in data/derived, written by ml augment and committed; choices made there are in ML_BUILD.md 3.5. ML_BUILD.md is a from-scratch recipe that stands alone (it needs only the dataset), in simple language and with no build status in it; keep it that way when editing.
- Explainability and the USP come first everywhere (UI copy, video, deck): a first-time viewer must understand the problem and how LedgerLens solves it. USP: rupees first, evidence for every Finding, a Draft fix to approve, Supplier rings, measured accuracy.

Update this section as phases land.

## Writing rules

These apply to code comments, docs, commit messages, PR descriptions and any user-facing copy.

- Never use em dashes. Use a comma, a colon, parentheses, or a plain hyphen.
- No ALL-CAPS in user-facing text or UI labels. Sentence case, always.
- No emoji unless the user asks for them.
- Plain, direct language. No marketing voice, no "seamlessly", no "delve into", no "it's not just X, it's Y".
- Comments explain why, not what. Match the density of the surrounding code. Don't narrate obvious lines.
- Keep comments to one line. If it needs a paragraph, the code is wrong or it belongs in a doc. No banner blocks, no ASCII dividers, no boxed headers.
- No decorative symbols in comments or copy: no backticks, tildes, arrows, asterisks, or box-drawing characters. Plain words and normal punctuation.
- Never invent a GST fact, rate, section number or statistic. If it is not verified with a source, it does not go in code, UI or slides.

## Stack (locked)

- ML and engine: Python 3.10.11, packages pinned in ml/requirements.txt (numpy 2.2.6, pandas 2.3.3, scipy 1.15.3, scikit-learn 1.7.2, rapidfuzz 3.14.5, networkx 3.4.2, pydantic 2.13.5, pytest 9.1.1).
- Backend API: FastAPI 0.142.2, uvicorn 0.54.0, SQLite through the standard library sqlite3 module (no ORM, no database server).
- AI: Groq API (OpenAI-compatible chat completions, called with httpx), key GROQ_API_KEY in backend/.env (never committed), model from LLM_MODEL. Every response cached to backend/cache; template fallback when no key or the call fails. The demo makes no live calls. The team has no Claude API key; plan files that say Claude or anthropic mean this Groq path.
- Frontend: Next.js 16.3 App Router, TypeScript 7.0 (fall back to the latest 5.x if Next.js tooling rejects 7.0), Tailwind CSS 4.3, shadcn/ui, Recharts 3.10, Cytoscape.js 3.34, TanStack Table; pnpm 10.
- UI is dark by default with a light theme behind the theme button; tokens live in frontend/app/globals.css (void black, bone white, iris violet, saffron), not the deck.
- Money is integer paise everywhere; format only at display, Indian grouping (Rs 4,20,000).

## Commands

Windows PowerShell from the repo root. Backend and frontend commands apply once those folders are scaffolded.

| Task | Command |
|---|---|
| ML install | python -m venv ml\.venv; ml\.venv\Scripts\python -m pip install -r ml\requirements.txt; ml\.venv\Scripts\python -m pip install -e ml |
| ML test | ml\.venv\Scripts\python -m pytest ml\tests -q |
| ML train and report | ml\.venv\Scripts\python -m ledgerlens_ml train --all; ml\.venv\Scripts\python -m ledgerlens_ml evaluate |
| Backend install | python -m venv backend\.venv; backend\.venv\Scripts\python -m pip install -r backend\requirements.txt; backend\.venv\Scripts\python -m pip install -e ml |
| Backend dev | backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000 |
| Warm the cache | cd backend; .venv\Scripts\python -m app.warm (loads the demo data and analyses the year once) |
| Precache Drafts | cd backend; .venv\Scripts\python -m app.drafts.precache --period 2025-09 |
| Engine check | backend\.venv\Scripts\python backend\scripts\check_engine.py |
| Start both | start.cmd (production frontend; run pnpm --dir frontend build first) |
| Journey screenshots | node frontend\scripts\shots.mjs <output folder> |
| Landing page data | node frontend\scripts\landing-data.mjs (writes frontend/lib/landing-data.json from a fresh September Run; run after any engine change that moves the numbers) |
| Backend test | backend\.venv\Scripts\python -m pytest backend\tests -q |
| Frontend install | pnpm --dir frontend install |
| Frontend dev | pnpm --dir frontend dev |
| Typecheck | pnpm --dir frontend typecheck |
| Lint | pnpm --dir frontend lint |
| Deck PDF and PPTX | python deck\render.py; node deck\tools\html2pptx.js |

## Scope cut line

Copied from CONTEXT.md; that file is the source if they ever differ.

- MVP: dataset load and GSTR-2B generation; booking, payment and supplier-filing Matches with Confidence and Bands; one-to-many matches; tax checks including the 22 Sep 2025 rate change; duplicates; Rule 37 and cancelled-GSTIN checks; rule-based Anomalies; ITC at risk, ITC found, Net payable; Findings with Rupee impact and reasons; dashboard, Finding detail, Supplier ring view; cached Drafts with template fallback; Catch rate and False alarm rate report.
- V2: learned supplier-filing matcher, Isolation Forest, Supplier scorecard ranking, ask in plain English, exports, file upload.
- Stretch: Benford screen, single-file executable, e-invoice IRN checks, GSTR-1 side.
- Out: login, multiple Companies, live portal or bank connections, sending email, mobile.

Cut features list (add back if time allows): keep it in plan/05-build-plan.md under "What not to build yet".

## Code style

- Simple and boring over clever. No abstraction until it is needed twice. No config systems, plugin layers or premature generality.
- Seams: ml/ledgerlens_ml owns data loading, normalisers, features and models; the backend imports only its public API (ML_BUILD.md 9.1). The backend engine owns tax rules, Findings, liability and the database; route handlers only call the engine and serialise. The frontend talks only to the backend API, never to files or the model.
- data.py is the only code that reads the workbook. Feature code is pure: frames in, frames out.
- Tests before implementation on the verifiable core only: normalisers, candidates, features, tax rules, liability maths, API contracts. Not on glue, UI or throwaway code.
- Typecheck and run tests as you go, not at the end.

## Who decides what

When the user explicitly asks for a feature, build it. If it costs something real, say what it costs and what it displaces in one line, then build it. Push back on your own proposals, on things the user is visibly unsure about, and on anything that breaks the demo. Do not re-open settled decisions. Flag scope creep once, in a line, then do what was asked.

## Browser verification

For anything with a UI: render it, screenshot it, compare with plan/04-design-system.md. Click through the real demo journey, not just the happy path. Check loading, empty and error states. Walk the whole journey with the console open before the demo. Use Claude in Chrome when the session has it, Playwright otherwise. Never say a UI works without opening it.

## Skills: when to reach for what

Reach for these yourself when the moment matches; don't wait for the user to name one. If you're about to do something a skill covers, use the skill instead of improvising it.

Planning:
  /grill-me         requirements interrogation (the architect runs this)
  /prototype        spike the riskiest unknown BEFORE committing to it
  /research         any API or SDK I haven't used before; hits primary sources
  /domain-modeling  pin down vocabulary before the schema
  /codebase-design  choosing module seams
  /zoom-out         mapping an unfamiliar existing codebase

Building:
  /tdd              the verifiable core only - scoring, parsing, API contracts.
                    Never on glue, UI, or throwaway code.
  /diagnose         the moment something breaks - reproduce, minimise, fix.
                    Not shotgun debugging.
  /verify-this      when I need evidence something works, not your summary
  /handoff          before context gets tight, not after
  /wait-what        I'll fire this the moment an explanation doesn't land

Before the demo, in this order:
  1. /thermo-nuclear-code-quality-review
        Aggressive structural audit - oversized files, spaghetti conditionals,
        leaky type boundaries, restructurings that delete complexity instead of
        moving it around.
        WHEN: once the MVP is stable and there's enough time left to act on
        what it finds. It proposes ambitious restructurings, so it needs
        runway. Never start it in the last tenth of the build window.
  2. /deslop
        Strips the AI residue: pointless comments, defensive try/catch on
        trusted paths, `any` casts that only silence the compiler. Fast, safe,
        run it any time after a big generated chunk.
  3. /simplify then /code-review
        Final pass.

/improve-codebase-architecture is for codebases that decayed over months. Skip
it on a short build where it costs time I don't have. If time is generous, or
the project continues past the event, run it once the MVP is stable.

## Context and sessions

- One task per session. Run /context before anything big; past about 40 percent, start fresh.
- If the session auto-compacts mid-task, stop and say so.
- Before every /handoff: write down what this session figured out that is not in a file yet (here, a plan/ file, or a comment where the surprise lives), then commit.
- Plan in Opus; switch to Sonnet once the work is mechanical.
- Never invent a requirement; say so out loud when guessing.
