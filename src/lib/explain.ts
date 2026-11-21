import { toHHMM } from "./time";

export type ReasonCode =
  | "AVAILABLE"
  | "OVERLAP"
  | "BLOCKED"
  | "INVALID_TIME"
  | "PAST_TIME"
  | "TOO_LONG";

export interface ExplainInput {
  roomLabel: string;
  start: number;
  end: number;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplainResult {
  explanation: string;
  source: "mock" | "fallback";
}

export interface CheckedInputs {
  start: number;
  end: number;
  now: number;
  roomBlocked: boolean;
}

export function explainIsStale(
  checked: CheckedInputs | null,
  current: CheckedInputs
): boolean {
  if (!checked) return false;
  return (
    checked.start !== current.start ||
    checked.end !== current.end ||
    checked.now !== current.now ||
    checked.roomBlocked !== current.roomBlocked
  );
}

export const FALLBACK_TIMEOUT_MS = 3000;

const ROOM_LABEL_RE = /^[A-Za-z0-9 -]+$/;

export function deriveReasonCode(
  isAvailable: boolean,
  reasons: string[]
): ReasonCode {
  if (isAvailable) return "AVAILABLE";
  const joined = reasons.join(" ").toLowerCase();
  if (joined.includes("blocked")) return "BLOCKED";
  if (joined.includes("overlap")) return "OVERLAP";
  if (joined.includes("after")) return "PAST_TIME";
  if (joined.includes("duration")) return "TOO_LONG";
  if (joined.includes("whole number") || joined.includes("0 ≤")) return "INVALID_TIME";
  return "INVALID_TIME";
}

export function validateInput(input: ExplainInput): string | null {
  const { roomLabel, isAvailable, reasonCode } = input;
  if (!roomLabel || roomLabel.length === 0) return "Room label is required.";
  if (roomLabel.length > 50) return "Room label must be 50 characters or fewer.";
  if (!ROOM_LABEL_RE.test(roomLabel)) return "Room label contains invalid characters.";
  if (!Number.isInteger(input.start) || !Number.isInteger(input.end)) {
    return "Start and end must be whole numbers of minutes.";
  }
  if (input.start < 0 || input.end > 1440 || input.start >= input.end) {
    return "Start and end must satisfy 0 ≤ start < end ≤ 1440.";
  }
  if (isAvailable && reasonCode !== "AVAILABLE") {
    return "reasonCode must be AVAILABLE when isAvailable is true.";
  }
  if (!isAvailable && reasonCode === "AVAILABLE") {
    return "reasonCode must not be AVAILABLE when isAvailable is false.";
  }
  return null;
}

const ALLOWED_TIMES = (start: number, end: number) =>
  new Set([toHHMM(start), toHHMM(end)]);

const HHMM_RE = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g;

export function validateOutput(
  raw: string,
  isAvailable: boolean,
  start: number,
  end: number
): string | null {
  const text = raw.trim();
  if (text.length === 0) return "Explanation is empty.";
  if (text.length > 240) return "Explanation exceeds 240 characters.";
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) return "Explanation exceeds 2 sentences.";
  const allowed = ALLOWED_TIMES(start, end);
  let m: RegExpExecArray | null;
  HHMM_RE.lastIndex = 0;
  while ((m = HHMM_RE.exec(text)) !== null) {
    if (!allowed.has(m[0])) {
      return `Explanation references a time (${m[0]}) other than the selected start/end.`;
    }
  }
  const lower = text.toLowerCase();
  if (isAvailable && /\bnot available\b|\bunavailable\b|\bnot free\b|\bis booked\b/.test(lower)) {
    return "Explanation contradicts the available status.";
  }
  if (!isAvailable && /\bis available\b|\bis free\b|\bcan be booked\b|\bopen to book\b/.test(lower)) {
    return "Explanation contradicts the unavailable status.";
  }
  return null;
}

export function runAdapter(
  produce: (input: ExplainInput) => string,
  input: ExplainInput
): ExplainResult {
  const raw = produce(input);
  const outputError = validateOutput(raw, input.isAvailable, input.start, input.end);
  if (outputError) return fallback(input);
  return { explanation: raw, source: "mock" };
}

function mockExplanation(input: ExplainInput): string {
  const { roomLabel, start, end, isAvailable, reasonCode } = input;
  const range = `${toHHMM(start)}–${toHHMM(end)}`;
  if (isAvailable) {
    return `${roomLabel} is available from ${range}. No rules are violated.`;
  }
  const reasonText: Record<Exclude<ReasonCode, "AVAILABLE">, string> = {
    OVERLAP: "it overlaps an existing booking",
    BLOCKED: "the room is blocked",
    INVALID_TIME: "the time range is invalid",
    PAST_TIME: "the start time is in the past",
    TOO_LONG: "the booking exceeds 120 minutes",
  };
  return `${roomLabel} is not available for ${range} because ${reasonText[reasonCode as Exclude<ReasonCode, "AVAILABLE">]}.`;
}

function fallback(input: ExplainInput): ExplainResult {
  const status = input.isAvailable ? "available" : "not available";
  return {
    explanation: `${input.roomLabel}: ${status} (${input.reasonCode}).`,
    source: "fallback",
  };
}

export async function explainAvailability(
  input: ExplainInput,
  adapter: (input: ExplainInput) => string = mockExplanation
): Promise<ExplainResult> {
  const inputError = validateInput(input);
  if (inputError) return fallback(input);

  const op = new Promise<ExplainResult>((resolve) => {
    try {
      resolve(runAdapter(adapter, input));
    } catch {
      resolve(fallback(input));
    }
  });

  const timeout = new Promise<ExplainResult>((resolve) =>
    setTimeout(() => resolve(fallback(input)), FALLBACK_TIMEOUT_MS)
  );

  return Promise.race([op, timeout]);
}

export function explainSync(input: ExplainInput): ExplainResult {
  const inputError = validateInput(input);
  if (inputError) return fallback(input);
  const raw = mockExplanation(input);
  const outputError = validateOutput(raw, input.isAvailable, input.start, input.end);
  if (outputError) return fallback(input);
  return { explanation: raw, source: "mock" };
}
