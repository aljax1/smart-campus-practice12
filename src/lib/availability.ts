export type ReasonCode =
  | "OK"
  | "PAST_START"
  | "INVALID_DURATION"
  | "ROOM_BLOCKED"
  | "OVERLAP"
  | "INVALID_INPUT";

export interface AvailabilityRequest {
  start: Date;
  durationMinutes: number;
  roomBlocked: boolean;
}

export interface AvailabilityResult {
  available: boolean;
  reasonCode: ReasonCode;
  message: string;
}

export interface InputValidation {
  ok: boolean;
  reasonCode: ReasonCode;
  message: string;
}

const MESSAGES: Record<ReasonCode, string> = {
  OK: "The room is available for the requested time.",
  PAST_START: "The start time must be in the future.",
  INVALID_DURATION: "Duration must be between 1 and 120 minutes.",
  ROOM_BLOCKED: "The room is blocked and cannot be booked.",
  OVERLAP: "The requested time overlaps an existing booking.",
  INVALID_INPUT: "Please enter a valid start datetime and duration.",
};

export function messageFor(code: ReasonCode): string {
  return MESSAGES[code];
}

export function validateInput(
  start: unknown,
  durationMinutes: unknown
): InputValidation {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    return { ok: false, reasonCode: "INVALID_INPUT", message: MESSAGES.INVALID_INPUT };
  }
  if (
    typeof durationMinutes !== "number" ||
    !Number.isFinite(durationMinutes) ||
    !Number.isInteger(durationMinutes)
  ) {
    return { ok: false, reasonCode: "INVALID_INPUT", message: MESSAGES.INVALID_INPUT };
  }
  return { ok: true, reasonCode: "OK", message: MESSAGES.OK };
}

function isPastStart(start: Date, now: Date): boolean {
  return start.getTime() <= now.getTime();
}

function isValidDuration(durationMinutes: number): boolean {
  return durationMinutes >= 1 && durationMinutes <= 120;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function calculateAvailability(
  request: AvailabilityRequest,
  bookings: ReadonlyArray<{ start: Date; end: Date; label: string }>,
  now: Date
): AvailabilityResult {
  const v = validateInput(request.start, request.durationMinutes);
  if (!v.ok) {
    return { available: false, reasonCode: v.reasonCode, message: v.message };
  }

  if (isPastStart(request.start, now)) {
    return { available: false, reasonCode: "PAST_START", message: MESSAGES.PAST_START };
  }

  if (!isValidDuration(request.durationMinutes)) {
    return {
      available: false,
      reasonCode: "INVALID_DURATION",
      message: MESSAGES.INVALID_DURATION,
    };
  }

  if (request.roomBlocked) {
    return { available: false, reasonCode: "ROOM_BLOCKED", message: MESSAGES.ROOM_BLOCKED };
  }

  const end = new Date(request.start.getTime() + request.durationMinutes * 60_000);
  for (const b of bookings) {
    if (overlaps(request.start, end, b.start, b.end)) {
      return { available: false, reasonCode: "OVERLAP", message: MESSAGES.OVERLAP };
    }
  }

  return { available: true, reasonCode: "OK", message: MESSAGES.OK };
}
