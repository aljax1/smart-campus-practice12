import { describe, it, expect } from "vitest";
import { calculateAvailability } from "../src/lib/availability";
import { ROOM_BOOKINGS } from "../src/lib/roomData";

const NOW = new Date("2026-11-24T12:00:00");

function check(
  startISO: string,
  durationMinutes: number,
  roomBlocked = false
) {
  return calculateAvailability(
    {
      start: new Date(startISO),
      durationMinutes,
      roomBlocked,
    },
    ROOM_BOOKINGS,
    NOW
  );
}

describe("Smart Campus availability contract", () => {
  it("T1: 2026-12-01 15:00, 30 min is available (OK)", () => {
    const r = check("2026-12-01T15:00:00", 30);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBe("OK");
  });

  it("T2: 2026-12-01 10:30, 60 min overlaps the 10:00-11:00 booking (OVERLAP)", () => {
    const r = check("2026-12-01T10:30:00", 60);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("OVERLAP");
  });

  it("T3: 2026-12-01 15:00, 60 min with room blocked (ROOM_BLOCKED)", () => {
    const r = check("2026-12-01T15:00:00", 60, true);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("ROOM_BLOCKED");
  });

  it("T4: duration 0 is invalid (INVALID_DURATION)", () => {
    const r = check("2026-12-01T15:00:00", 0);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("INVALID_DURATION");
  });

  it("T5: duration 121 is invalid (INVALID_DURATION)", () => {
    const r = check("2026-12-01T15:00:00", 121);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("INVALID_DURATION");
  });

  it("T6: start 2026-11-01 15:00 is in the past (PAST_START)", () => {
    const r = check("2026-11-01T15:00:00", 30);
    expect(r.available).toBe(false);
    expect(r.reasonCode).toBe("PAST_START");
  });

  it("T7: 2026-12-01 11:00, 60 min is adjacent (not an overlap) and available (OK)", () => {
    const r = check("2026-12-01T11:00:00", 60);
    expect(r.available).toBe(true);
    expect(r.reasonCode).toBe("OK");
  });

  it("T8: bookings array is identical before and after all checks", () => {
    const before = JSON.stringify(
      ROOM_BOOKINGS.map((b) => ({
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        label: b.label,
      }))
    );
    check("2026-12-01T10:30:00", 60);
    check("2026-12-01T15:00:00", 30, true);
    check("2026-12-01T15:00:00", 0);
    const after = JSON.stringify(
      ROOM_BOOKINGS.map((b) => ({
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        label: b.label,
      }))
    );
    expect(after).toBe(before);
  });
});
