/**
 * Orchestrator — provider selection + the validate-and-retry loop.
 *
 * This is the piece that makes the planner trustworthy. No matter which provider
 * produced the JSON, it must pass parseDeck before it is returned. If it fails,
 * the errors are fed back to the SAME provider as repair context, up to N times.
 * If every attempt fails (or no model is configured), we fall back to the
 * template planner, which is guaranteed to produce a valid deck.
 */

import { parseDeck, lintDeck, type Deck } from "../deck-spec";
import type { DeckPlanner } from "./types";
import { ClaudePlanner, OpenAIPlanner, OllamaPlanner } from "./providers";
import { TemplatePlanner } from "./templatePlanner";

export interface PlanResult {
  deck: Deck;
  provider: string;
  attempts: number;
  warnings: string[];
  /** True if we had to fall back to the template planner. */
  usedFallback: boolean;
}

interface Env {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OLLAMA_HOST?: string;
  SLIDELANG_PROVIDER?: string; // optional explicit override
}

/** Choose the primary provider by availability (explicit override wins). */
export function selectProvider(env: Env): DeckPlanner {
  const explicit = env.SLIDELANG_PROVIDER?.toLowerCase();
  if (explicit === "template") return new TemplatePlanner();
  if (explicit === "claude" && env.ANTHROPIC_API_KEY) return new ClaudePlanner(env.ANTHROPIC_API_KEY);
  if (explicit === "openai" && env.OPENAI_API_KEY) return new OpenAIPlanner(env.OPENAI_API_KEY);
  if (explicit === "ollama") return new OllamaPlanner();

  if (env.ANTHROPIC_API_KEY) return new ClaudePlanner(env.ANTHROPIC_API_KEY);
  if (env.OPENAI_API_KEY) return new OpenAIPlanner(env.OPENAI_API_KEY);
  // Ollama is only chosen explicitly or as the configured host, since we can't
  // cheaply probe it here; the backend route probes it before calling this.
  if (env.OLLAMA_HOST) return new OllamaPlanner(undefined, env.OLLAMA_HOST);
  return new TemplatePlanner();
}

/**
 * Generate a validated deck. Tries the chosen provider with up to `maxAttempts`
 * validate-and-repair rounds, then falls back to the template planner.
 */
export async function planDeck(
  prompt: string,
  env: Env,
  maxAttempts = 3
): Promise<PlanResult> {
  const provider = selectProvider(env);

  // The template planner is deterministic and always valid — no retry needed.
  if (provider.name === "template") {
    const raw = await provider.generate(prompt);
    const parsed = parseDeck(raw);
    if (!parsed.ok) throw new Error("template planner produced invalid deck: " + parsed.errors.join("; "));
    return { deck: parsed.deck, provider: "template", attempts: 1, warnings: lintDeck(parsed.deck), usedFallback: false };
  }

  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await provider.generate(prompt, lastErrors.length ? lastErrors.join("\n") : undefined);
      const parsed = parseDeck(raw);
      if (parsed.ok) {
        return {
          deck: parsed.deck,
          provider: provider.name,
          attempts: attempt,
          warnings: lintDeck(parsed.deck),
          usedFallback: false,
        };
      }
      lastErrors = parsed.errors; // feed back into the next attempt
    } catch (e) {
      lastErrors = [(e as Error).message];
    }
  }

  // Every model attempt failed — degrade gracefully to the template planner.
  const fallback = new TemplatePlanner();
  const raw = await fallback.generate(prompt);
  const parsed = parseDeck(raw);
  if (!parsed.ok) throw new Error("fallback planner failed: " + parsed.errors.join("; "));
  return {
    deck: parsed.deck,
    provider: `template (fallback after ${provider.name} failed)`,
    attempts: maxAttempts,
    warnings: lintDeck(parsed.deck),
    usedFallback: true,
  };
}
