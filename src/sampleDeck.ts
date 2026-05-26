import type { Deck } from "./deck-spec";

/** A starter deck so the editor opens with something real to edit. */
export const sampleDeck: Deck = {
  schemaVersion: 1,
  id: "starter",
  title: "Slidelang — Starter Deck",
  aspectRatio: "16:9",
  theme: {
    palette: {
      background: "#10100f",
      surface: "#1c1b19",
      text: "#f5f1e8",
      accent: "#e2703a",
      muted: "#9c968a",
    },
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    baseFontPt: 18,
  },
  slides: [
    {
      id: "cover",
      layout: "title",
      blocks: [
        {
          id: "title",
          type: "text",
          role: "title",
          align: "center",
          z: 0,
          lines: [{ text: "Deck as Code", level: 0, bullet: false }],
        },
        {
          id: "sub",
          type: "text",
          role: "subtitle",
          align: "center",
          z: 0,
          lines: [{ text: "Structured decks that compile, validate, and present", level: 0, bullet: false }],
        },
      ],
    },
    {
      id: "why",
      layout: "title-content",
      blocks: [
        {
          id: "h",
          type: "text",
          role: "title",
          align: "left",
          z: 0,
          lines: [{ text: "Why structured authoring", level: 0, bullet: false }],
        },
        {
          id: "pts",
          type: "text",
          role: "body",
          align: "left",
          z: 0,
          lines: [
            { text: "Editable: slides are data, not baked pixels", level: 0, bullet: true },
            { text: "Reviewable: specs diff and version like code", level: 0, bullet: true },
            { text: "Trustworthy: a compiler — not the LLM — guarantees layout", level: 0, bullet: true },
          ],
        },
      ],
    },
    {
      id: "data",
      layout: "two-column",
      blocks: [
        {
          id: "h2",
          type: "text",
          role: "title",
          align: "left",
          z: 0,
          lines: [{ text: "Charts and math are primitives", level: 0, bullet: false }],
        },
        {
          id: "chart",
          type: "chart",
          chartType: "bar",
          title: "Revenue ($M)",
          z: 0,
          categories: ["Q1", "Q2", "Q3", "Q4"],
          series: [{ name: "Actual", values: [2.1, 3.4, 4.0, 5.2] }],
          yLabel: "$M",
        },
        {
          id: "math",
          type: "math",
          z: 0,
          latex: "g = \\frac{R_t - R_{t-1}}{R_{t-1}}",
          display: true,
        },
      ],
    },
  ],
};
