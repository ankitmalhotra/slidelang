# Slidelang — Submission Index & Access Notes

## Artifacts (review order: demo → TDD → PRD)

| Artifact | Location |
|---|---|
| **Demo video** | https://drive.google.com/file/d/1stCh7oxqW7YIEUT22JEwnk-75AadbKx7/view?usp=sharing |
| **PRD** | `docs/PRD.md` |
| **TDD** | `docs/TDD.md` |
| **Source code** | https://github.com/ankitmalhotra/slidelang |
| **Build / authorship note** | `docs/BUILD_NOTE.md` |

## Run the prototype (no API key required)

```bash
npm install
npm run dev:all        # frontend on http://localhost:5173, API on :8787
```
Requires Node 18+. With **no API key**, generation uses a deterministic template
planner — the full prompt → deck → edit → present workflow works at zero cost.

To enable AI generation with Claude:
```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev:all
```
Default model is `claude-haiku-4-5` (cheapest). Override with `ANTHROPIC_MODEL=...`.

## Verify without the UI (offline)

```bash
npx tsx test-schema.ts     # schema: valid + broken decks
npx tsx test-compiler.ts   # compiler: auto-layout
npx tsx test-planner.ts    # planner: template path, heuristics, validation
```

## Access notes / credentials

- **Repo:** _[public — no access needed / OR: private, reviewer access added for: ____]_
- **API keys:** none required to run or verify (template planner). No credentials
  are committed; `.env` is git-ignored. Reviewers may supply their own key to see
  Claude-generated content, but it is not necessary to evaluate the system.
- **No database, no external services** beyond an optional LLM API.
