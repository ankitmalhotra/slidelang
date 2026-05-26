import { planDeck } from "./src/planner/orchestrator";
import { parseDeck } from "./src/deck-spec";
import { TemplatePlanner } from "./src/planner/templatePlanner";

async function main() {
  // 1) Template planner end to end (no model, no network).
  console.log("=== Template planner ===");
  const r1 = await planDeck("Q3 revenue growth vs plan with a chart", { SLIDELANG_PROVIDER: "template" });
  console.log(`provider=${r1.provider} attempts=${r1.attempts} slides=${r1.deck.slides.length} fallback=${r1.usedFallback}`);
  console.log("slide layouts:", r1.deck.slides.map((s) => `${s.id}:${s.layout}`).join(", "));
  console.log("warnings:", r1.warnings.length ? r1.warnings : "(none)");

  // 2) Prove the template planner reacts to prompt heuristics.
  console.log("\n=== Heuristics ===");
  const plain = await planDeck("introduction to our team", { SLIDELANG_PROVIDER: "template" });
  const chart = await planDeck("sales metrics and revenue forecast", { SLIDELANG_PROVIDER: "template" });
  console.log("plain prompt slides:", plain.deck.slides.map((s) => s.id).join(", "));
  console.log("chart prompt slides:", chart.deck.slides.map((s) => s.id).join(", "), "(should include 'data')");

  // 3) Directly exercise the template output through the validator.
  console.log("\n=== Validation of generated spec ===");
  const raw = await new TemplatePlanner().generate("compare option A versus option B");
  const parsed = parseDeck(raw);
  console.log(parsed.ok ? `valid deck with ${parsed.deck.slides.length} slides` : parsed.errors);
  if (parsed.ok) {
    console.log("includes comparison slide:", parsed.deck.slides.some((s) => s.id === "compare"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
