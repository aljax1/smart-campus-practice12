import { describe, it, expect } from "vitest";
import { checkAvailability } from "../src/lib/check";
import { Booking } from "../src/lib/time";

const NOW = 540;

function check(
  start: number,
  end: number,
  opts?: Partial<{ now: number; roomBlocked: boolean; bookings: Booking[] }>
) {
  return checkAvailability(
    start,
    end,
    opts?.now ?? NOW,
    opts?.roomBlocked ?? false,
    opts?.bookings ?? []
  );
}

describe("checkAvailability", () => {
  describe("start >= end is rejected", () => {
    it("rejects start equal to end", () => {
      const r = check(600, 600);
      expect(r.kind).toBe("unavailable");
      if (r.kind === "unavailable") expect(r.reasons.length).toBeGreaterThan(0);
    });

    it("rejects start after end", () => {
      const r = check(700, 650);
      expect(r.kind).toBe("unavailable");
    });
  });

  describe("past requests are rejected", () => {
    it("rejects start strictly at now (not after)", () => {
      const r = check(540, 570);
      expect(r.kind).toBe("unavailable");
      if (r.kind === "unavailable") {
        expect(r.reasons.some((x) => x.toLowerCase().includes("after"))).toBe(true);
      }
    });

    it("rejects start before now", () => {
      const r = check(480, 510, { now: 540 });
      expect(r.kind).toBe("unavailable");
    });
  });

  describe("max duration 120 minutes", () => {
    it("allows exactly 120 minutes", () => {
      const r = check(660, 780);
      expect(r.kind).toBe("available");
    });

    it("rejects 121 minutes", () => {
      const r = check(660, 781);
      expect(r.kind).toBe("unavailable");
      if (r.kind === "unavailable") {
        expect(r.reasons.some((x) => x.includes("120"))).toBe(true);
      }
    });
  });

  describe("blocked room is rejected", () => {
    it("rejects when roomBlocked is true even with otherwise-valid times", () => {
      const r = check(660, 720, { roomBlocked: true });
      expect(r.kind).toBe("unavailable");
      if (r.kind === "unavailable") {
        expect(r.reasons.some((x) => x.toLowerCase().includes("blocked"))).toBe(true);
      }
    });

    it("allows when roomBlocked is false", () => {
      const r = check(660, 720, { roomBlocked: false });
      expect(r.kind).toBe("available");
    });
  });

  describe("overlaps are rejected but touching endpoints are allowed", () => {
    const bookings: Booking[] = [{ start: 600, end: 660, label: "Existing" }];

    it("rejects a booking that overlaps the existing one", () => {
      const r = check(630, 690, { bookings });
      expect(r.kind).toBe("unavailable");
      if (r.kind === "unavailable") {
        expect(r.reasons.some((x) => x.toLowerCase().includes("overlap"))).toBe(true);
      }
    });

    it("allows a booking whose start equals the existing booking's end (touching)", () => {
      const r = check(660, 720, { bookings });
      expect(r.kind).toBe("available");
    });

    it("allows a booking whose end equals the existing booking's start (touching)", () => {
      const r = check(541, 600, { bookings });
      expect(r.kind).toBe("available");
    });
  });

  describe("availability check must not modify the bookings array", () => {
    it("leaves an unsorted bookings array unchanged after a successful call", () => {
      const bookings: Booking[] = [
        { start: 780, end: 840, label: "Later" },
        { start: 600, end: 660, label: "Existing" },
      ];
      const snapshot = JSON.stringify(bookings);
      check(660, 720, { bookings });
      expect(JSON.stringify(bookings)).toBe(snapshot);
    });
  });
});
