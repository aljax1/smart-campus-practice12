import { describe, it, expect } from "vitest";
import {
  explainAvailability,
  explainIsStale,
  ExplainInput,
  CheckedInputs,
} from "../src/lib/explain";

const baseInput = (over: Partial<ExplainInput>): ExplainInput => ({
  roomLabel: "Room 301",
  start: 660,
  end: 720,
  isAvailable: true,
  reasonCode: "AVAILABLE",
  ...over,
});

describe("regression: stale inputs invalidate the explainable result", () => {
  it("flags stale when any checked input differs from current", () => {
    const checked: CheckedInputs = { start: 660, end: 720, now: 540, roomBlocked: false };

    expect(explainIsStale(checked, { ...checked })).toBe(false);

    expect(
      explainIsStale(checked, { ...checked, start: 700 })
    ).toBe(true);
    expect(
      explainIsStale(checked, { ...checked, end: 780 })
    ).toBe(true);
    expect(
      explainIsStale(checked, { ...checked, now: 600 })
    ).toBe(true);
    expect(
      explainIsStale(checked, { ...checked, roomBlocked: true })
    ).toBe(true);
  });

  it("treats a null checked state as not stale", () => {
    expect(
      explainIsStale(null, { start: 660, end: 720, now: 540, roomBlocked: false })
    ).toBe(false);
  });
});

describe("regression: adapter error yields deterministic fallback", () => {
  it("returns fallback when the adapter throws", async () => {
    const input = baseInput({});
    const throwing = () => {
      throw new Error("adapter blew up");
    };
    const r = await explainAvailability(input, throwing);
    expect(r.source).toBe("fallback");
    expect(r.explanation).toBe("Room 301: available (AVAILABLE).");
  });

  it("still returns fallback when the adapter produces invalid output", async () => {
    const input = baseInput({ isAvailable: false, reasonCode: "OVERLAP" });
    const badAdapter = () => "Room 301 is available from 08:00–09:00.";
    const r = await explainAvailability(input, badAdapter);
    expect(r.source).toBe("fallback");
  });
});
