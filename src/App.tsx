import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  DoorClosed,
  CalendarClock,
  DoorOpen,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Booking, ROOM_BOOKINGS, toHHMM } from "@/lib/time";
import { checkAvailability, AvailabilityResult } from "@/lib/check";
import {
  explainAvailability,
  deriveReasonCode,
  explainIsStale,
  ExplainResult,
  CheckedInputs,
} from "@/lib/explain";

const MAX_MINUTES = 1440;
const ROOM_LABEL = "Room 301";

export default function App() {
  const [start, setStart] = useState(690);
  const [end, setEnd] = useState(750);
  const [now, setNow] = useState(540);
  const [roomBlocked, setRoomBlocked] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [checkedInputs, setCheckedInputs] = useState<CheckedInputs | null>(null);
  const [explain, setExplain] = useState<ExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);

  const startErr = start < 0 || start >= MAX_MINUTES;
  const endErr = end < 0 || end > MAX_MINUTES;

  const handleCheck = () => {
    const r = checkAvailability(start, end, now, roomBlocked, ROOM_BOOKINGS);
    setResult(r);
    setCheckedInputs({ start, end, now, roomBlocked });
    setExplain(null);
  };

  const handleExplain = async () => {
    if (!result) return;
    if (
      checkedInputs &&
      explainIsStale(checkedInputs, { start, end, now, roomBlocked })
    ) {
      setResult(null);
      setCheckedInputs(null);
      setExplain(null);
      return;
    }
    const isAvailable = result.kind === "available";
    const reasons = result.kind === "unavailable" ? result.reasons : [];
    const reasonCode = deriveReasonCode(isAvailable, reasons);
    setExplaining(true);
    try {
      const r = await explainAvailability({
        roomLabel: ROOM_LABEL,
        start,
        end,
        isAvailable,
        reasonCode,
      });
      setExplain(r);
    } catch {
      setExplain({
        explanation: `${ROOM_LABEL}: ${isAvailable ? "available" : "not available"} (${reasonCode}).`,
        source: "fallback",
      });
    } finally {
      setExplaining(false);
    }
  };

  const bookingsByTime = useMemo(
    () => [...ROOM_BOOKINGS].sort((a, b) => a.start - b.start),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Header />

        <main className="mt-6 space-y-5">
          <RoomCard roomBlocked={roomBlocked} setRoomBlocked={setRoomBlocked} />

          <TimeInputs
            start={start}
            end={end}
            now={now}
            setStart={setStart}
            setEnd={setEnd}
            setNow={setNow}
            startErr={startErr}
            endErr={endErr}
          />

          <CheckButton onClick={handleCheck} />

          {result && (
            <>
              <ResultPanel result={result} />
              <ExplainButton
                onClick={handleExplain}
                disabled={explaining}
                loading={explaining}
              />
              {explain && <ExplainPanel explain={explain} />}
            </>
          )}

          <BookingsList bookings={bookingsByTime} now={now} />
        </main>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Fictional data · Availability check only · No bookings are created
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <DoorOpen className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Smart Campus Room Availability
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Room 301 · Check whether a time slot is free before you plan to book
      </p>
    </header>
  );
}

function RoomCard({
  roomBlocked,
  setRoomBlocked,
}: {
  roomBlocked: boolean;
  setRoomBlocked: (v: boolean) => void;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
        roomBlocked
          ? "border-red-200 bg-red-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              roomBlocked
                ? "bg-red-100 text-red-600"
                : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {roomBlocked ? (
              <DoorClosed className="h-5 w-5" />
            ) : (
              <DoorOpen className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Room 301</p>
            <p
              className={`text-xs font-medium ${
                roomBlocked ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {roomBlocked ? "Blocked" : "Open"}
            </p>
          </div>
        </div>

        <Toggle roomBlocked={roomBlocked} setRoomBlocked={setRoomBlocked} />
      </div>
    </section>
  );
}

function Toggle({
  roomBlocked,
  setRoomBlocked,
}: {
  roomBlocked: boolean;
  setRoomBlocked: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={roomBlocked}
      aria-label="Toggle room blocked"
      onClick={() => setRoomBlocked(!roomBlocked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        roomBlocked ? "bg-red-500" : "bg-emerald-500"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          roomBlocked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function TimeInputs({
  start,
  end,
  now,
  setStart,
  setEnd,
  setNow,
  startErr,
  endErr,
}: {
  start: number;
  end: number;
  now: number;
  setStart: (v: number) => void;
  setEnd: (v: number) => void;
  setNow: (v: number) => void;
  startErr: boolean;
  endErr: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Clock className="h-4 w-4 text-blue-600" />
        Booking window
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TimeField
          label="Start time"
          value={start}
          onChange={setStart}
          error={startErr}
          hint={toHHMM(start)}
        />
        <TimeField
          label="End time"
          value={end}
          onChange={setEnd}
          error={endErr}
          hint={toHHMM(end)}
        />
        <TimeField
          label="Current time (now)"
          value={now}
          onChange={setNow}
          error={now < 0 || now > 1439}
          hint={toHHMM(now)}
        />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Start and now: 0–1439. End: up to 1440 (24:00). HH:MM shown beside each field.
      </p>
    </section>
  );
}

function TimeField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error: boolean;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={1440}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isNaN(n) ? 0 : n);
          }}
          className={`w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none transition focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
              : "border-slate-200 focus:border-blue-400 focus:ring-blue-200"
          }`}
        />
        <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-blue-700">
          {hint}
        </span>
      </div>
    </label>
  );
}

function CheckButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <CalendarClock className="h-4 w-4" />
      Check availability
    </button>
  );
}

function ExplainButton({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {loading ? "Generating explanation…" : "Explain availability"}
    </button>
  );
}

function ExplainPanel({ explain }: { explain: ExplainResult }) {
  return (
    <section
      aria-label="AI-generated explanation"
      className="rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-50 to-slate-50 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            AI-generated explanation — not a confirmed booking
          </p>
          <p className="mt-1 text-sm text-slate-700">{explain.explanation}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">
            Source: {explain.source === "mock" ? "mock adapter" : "fallback"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ResultPanel({ result }: { result: AvailabilityResult }) {
  if (result.kind === "available") {
    return (
      <section className="animate-in rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="text-base font-semibold text-emerald-800">Available</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              This time slot is free and satisfies every booking rule. You may
              proceed to book it elsewhere.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-red-800">Unavailable</p>
          <ul className="mt-1.5 space-y-1 text-sm text-red-700">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function BookingsList({ bookings, now }: { bookings: Booking[]; now: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <CalendarClock className="h-4 w-4 text-blue-600" />
        Existing bookings for Room 301
      </h2>
      <ul className="divide-y divide-slate-100">
        {bookings.map((b, i) => {
          const isPast = b.end <= now;
          const isActive = b.start <= now && now < b.end;
          return (
            <li key={i} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {b.label}
                </p>
                <p className="text-xs tabular-nums text-slate-500">
                  {toHHMM(b.start)} – {toHHMM(b.end)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : isPast
                      ? "bg-slate-100 text-slate-400"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {isActive ? "In progress" : isPast ? "Past" : "Upcoming"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        These bookings are read-only. The checker never adds, edits, or removes
        them.
      </p>
    </section>
  );
}
