/**
 * Slidelang backend — a thin API in front of the planner.
 *
 *   POST /api/generate  { prompt }  -> { deck, provider, attempts, warnings, usedFallback }
 *   GET  /api/health                -> { ok, providerAvailable }
 *
 * Why a backend at all: API keys must never reach the browser. The planner runs
 * here; the client only ever sees the resulting (validated) deck spec.
 *
 * Run:  ANTHROPIC_API_KEY=sk-... npm run server
 * Or with no key at all — it falls back to the template planner automatically.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { planDeck, selectProvider } from "../src/planner/orchestrator";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  SLIDELANG_PROVIDER: process.env.SLIDELANG_PROVIDER,
};

app.get("/api/health", (_req, res) => {
  const provider = selectProvider(env);
  res.json({ ok: true, provider: provider.name });
});

app.post("/api/generate", async (req, res) => {
  const prompt = (req.body?.prompt ?? "").toString().trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const result = await planDeck(prompt, env);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  const provider = selectProvider(env);
  console.log(`Slidelang backend on http://localhost:${port}  (provider: ${provider.name})`);
});
