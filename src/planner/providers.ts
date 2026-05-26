/**
 * Provider adapters. Each takes a prompt + system prompt and returns the model's
 * raw text, which the orchestrator parses as JSON. They share one job: get the
 * model to emit a spec. They differ only in transport.
 *
 * These run server-side (in the Node backend) so API keys never touch the client.
 */

import { DeckPlanner, SYSTEM_PROMPT, buildUserMessage } from "./types";

/** Strip accidental markdown fences a model might wrap around JSON. */
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

/* ---------------------------- Anthropic / Claude ---------------------------- */

export class ClaudePlanner implements DeckPlanner {
  readonly name = "claude";
  constructor(private apiKey: string, private model = "claude-sonnet-4-20250514") {}

  async generate(prompt: string, repairContext?: string): Promise<unknown> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(prompt, repairContext) }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    return JSON.parse(stripFences(text));
  }
}

/* ------------------------------- OpenAI ------------------------------------- */

export class OpenAIPlanner implements DeckPlanner {
  readonly name = "openai";
  constructor(private apiKey: string, private model = "gpt-4o-mini") {}

  async generate(prompt: string, repairContext?: string): Promise<unknown> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        // response_format json_object nudges the model to emit valid JSON.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(prompt, repairContext) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return JSON.parse(stripFences(data.choices[0].message.content));
  }
}

/* ------------------------------- Ollama (local) ----------------------------- */

export class OllamaPlanner implements DeckPlanner {
  readonly name = "ollama";
  constructor(private model = "llama3.1", private host = "http://localhost:11434") {}

  async generate(prompt: string, repairContext?: string): Promise<unknown> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        format: "json", // Ollama can constrain output to JSON
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(prompt, repairContext) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return JSON.parse(stripFences(data.message.content));
  }
}
