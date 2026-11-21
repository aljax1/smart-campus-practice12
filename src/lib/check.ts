import { Booking } from "./time";

export type AvailabilityResult =
  | { kind: "available" }
  | { kind: "unavailable"; reasons: string[] };

export function checkAvailability(
  start: number,
  end: number,
  now: number,
  roomBlocked: boolean,
  bookings: Booking[]
): AvailabilityResult {
  const reasons: string[] = [];

  if (!Number.isInteger(start) || !Number.isInteger(end) || !Number.isInteger(now)) {
    reasons.push("Times must be whole numbers of minutes.");
    return { kind: "unavailable", reasons };
  }

  if (!(start >= 0 && end <= 1440 && start < end)) {
    reasons.push("Start and end times must satisfy 0 ≤ start < end ≤ 1440 (24:00).");
  }
  if (start <= now) {
    reasons.push("Start time must be strictly after the current time.");
  }
  if (end - start > 120) {
    reasons.push("Booking duration must be 120 minutes or less.");
  }
  if (roomBlocked) {
    reasons.push("The room is currently blocked and cannot be booked.");
  }

  for (const b of bookings) {
    if (start < b.end && b.start < end) {
      reasons.push(
        `Overlaps existing booking ${formatRange(b.start, b.end)} (${b.label}).`
      );
    }
  }

  if (reasons.length > 0) return { kind: "unavailable", reasons };
  return { kind: "available" };
}

function formatRange(s: number, e: number): string {
  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `${hhmm(s)}–${hhmm(e)}`;
}
