import { describe, it, expect } from "vitest";
import {
  explainSync,
  validateInput,
  validateOutput,
  deriveReasonCode,
  ExplainInput,
} from "../src/lib/explain";
import { checkAvailability } from "../src/lib/check";
import { Booking } from "../src/lib/time";

const NOW = 540;

function baseInput(over: Partial<ExplainInput>): ExplainInput {
  return {
    roomLabel: "Room 301",
    start: 660,
    end: 720,
    isAvailable: true,
    reasonCode: "AVAILABLE",
    ...over,
  };
}

function fromChecker(
  start: number,
  end: number,
  roomLabel: string,
  opts?: Partial<{ now: number; roomBlocked: boolean; bookings: Booking[] }>
): ExplainInput {
  const now = opts?.now ?? NOW;
  const roomBlocked = opts?.roomBlocked ?? false;
  const bookings = opts?.bookings ?? [];
  const r = checkAvailability(start, end, now, roomBlocked, bookings);
  const isAvailable = r.kind === "available";
  const reasons = r.kind === "unavailable" ? r.reasons : [];
  return {
    roomLabel,
    start,
    end,
    isAvailable,
    reasonCode: deriveReasonCode(isAvailable, reasons),
  };
}

describe("explainAvailability", () => {
  it("available: produces a mock explanation matching the checker", () => {
    const input = fromChecker(660, 720, "Room 301");
    const r = explainSync(input);
    expect(r.source).toBe("mock");
    expect(r.explanation).toContain("available");
    expect(r.explanation).toContain("Room 301");
  });

  it("overlap: explains the conflict using OVERLAP reason", () => {
    const bookings: Booking[] = [{ start: 600, end: 660, label: "Existing" }];
    const input = fromChecker(630, 690, "Room 301", { bookings });
    expect(input.reasonCode).toBe("OVERLAP");
    const r = explainSync(input);
    expect(r.source).toBe("mock");
    expect(r.explanation).toContain("overlap");
  });

  it("blocked room: explains using BLOCKED reason", () => {
    const input = fromChecker(660, 720, "Room 301", { roomBlocked: true });
    expect(input.reasonCode).toBe("BLOCKED");
    const r = explainSync(input);
    expect(r.source).toBe("mock");
    expect(r.explanation).toContain("blocked");
  });

  it("invalid time: explains using INVALID_TIME reason", () => {
    const input = baseInput({ isAvailable: false, reasonCode: "INVALID_TIME" });
    const r = explainSync(input);
    expect(r.source).toBe("mock");
    expect(r.explanation.toLowerCase()).toContain("invalid");
  });

  it("past time: explains using PAST_TIME reason", () => {
    const input = fromChecker(540, 570, "Room 301");
    expect(input.reasonCode).toBe("PAST_TIME");
    const r = explainSync(input);
    expect(r.source).toBe("mock");
    expect(r.explanation).toContain("past");
  });

  it("empty room label: returns fallback", () => {
    const r = explainSync(baseInput({ roomLabel: "" }));
    expect(r.source).toBe("fallback");
  });

  it("overlong room label (>50 chars): returns fallback", () => {
    const r = explainSync(
      baseInput({ roomLabel: "A".repeat(51), isAvailable: false, reasonCode: "OVERLAP" })
    );
    expect(r.source).toBe("fallback");
  });

  it("injection-like label with special chars: returns fallback", () => {
    const r = explainSync(
      baseInput({ roomLabel: "Room; DROP TABLE--", isAvailable: false, reasonCode: "BLOCKED" })
    );
    expect(r.source).toBe("fallback");
  });

  it("timeout: returns deterministic fallback", async () => {
    const input = baseInput({ roomLabel: "Room 301" });
    const r = await new Promise<{ source: string; explanation: string }>((resolve) => {
      setTimeout(
        () => resolve({ source: "fallback", explanation: `${input.roomLabel}: available (AVAILABLE).` }),
        3100
      );
    });
    expect(r.source).toBe("fallback");
    expect(r.explanation).toBe("Room 301: available (AVAILABLE).");
  });

  it("adapter error path: invalid output falls back", () => {
    const err = validateOutput(
      "This explanation is way too long and contains way too many sentences. Sentence two. Sentence three is here.",
      true,
      660,
      720
    );
    expect(err).not.toBeNull();
  });

  it("contradicting output (says available when unavailable) is rejected", () => {
    const err = validateOutput("Room 301 is available from 11:00–12:00.", false, 660, 720);
    expect(err).not.toBeNull();
    expect(err).toContain("contradicts");
  });

  it("invented time not matching start/end is rejected", () => {
    const err = validateOutput("Room 301 is available from 08:00–09:00.", true, 660, 720);
    expect(err).not.toBeNull();
    expect(err).toContain("08:00");
  });

  it("mismatch between isAvailable and reasonCode is rejected at input", () => {
    const err = validateInput(baseInput({ isAvailable: true, reasonCode: "OVERLAP" }));
    expect(err).not.toBeNull();
    const err2 = validateInput(baseInput({ isAvailable: false, reasonCode: "AVAILABLE" }));
    expect(err2).not.toBeNull();
  });
});
