import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  DoorClosed,
  DoorOpen,
  CalendarClock,
  Timer,
} from "lucide-react";
import {
  ROOM_BOOKINGS,
  ROOM_LABEL,
  formatDateTime,
  toLocalInputValue,
} from "@/lib/roomData";
import { calculateAvailability, AvailabilityResult } from "@/lib/availability";

const DEFAULT_START = toLocalInputValue(new Date("2026-12-01T15:00:00"));
const DEFAULT_DURATION = 30;

export default function App() {
  const [startValue, setStartValue] = useState(DEFAULT_START);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [roomBlocked, setRoomBlocked] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);

  const bookingsByTime = useMemo(
    () => [...ROOM_BOOKINGS].sort((a, b) => a.start.getTime() - b.start.getTime()),
    []
  );

  const handleCheck = () => {
    const start = new Date(startValue);
    const r = calculateAvailability(
      { start, durationMinutes: duration, roomBlocked },
      ROOM_BOOKINGS,
      new Date()
    );
    setResult(r);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Header />

        <main className="mt-6 space-y-5">
          <RoomCard
            roomBlocked={roomBlocked}
            setRoomBlocked={setRoomBlocked}
            onBlockedChange={() => setResult(null)}
          />

          <BookingInputs
            startValue={startValue}
            duration={duration}
            setStartValue={(v) => {
              setStartValue(v);
              setResult(null);
            }}
            setDuration={(v) => {
              setDuration(v);
              setResult(null);
            }}
          />

          <CheckButton onClick={handleCheck} />

          {result && <ResultPanel result={result} />}

          <BookingsList bookings={bookingsByTime} />
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
        Room {ROOM_LABEL} · Check whether a time slot is free before you plan to book
      </p>
    </header>
  );
}

function RoomCard({
  roomBlocked,
  setRoomBlocked,
  onBlockedChange,
}: {
  roomBlocked: boolean;
  setRoomBlocked: (v: boolean) => void;
  onBlockedChange: () => void;
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
            <p className="text-sm font-semibold">Room {ROOM_LABEL}</p>
            <p
              className={`text-xs font-medium ${
                roomBlocked ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {roomBlocked ? "Blocked" : "Open"}
            </p>
          </div>
        </div>

        <Toggle
          roomBlocked={roomBlocked}
          setRoomBlocked={(v) => {
            setRoomBlocked(v);
            onBlockedChange();
          }}
        />
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

function BookingInputs({
  startValue,
  duration,
  setStartValue,
  setDuration,
}: {
  startValue: string;
  duration: number;
  setStartValue: (v: string) => void;
  setDuration: (v: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Clock className="h-4 w-4 text-blue-600" />
        Booking request
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Start date &amp; time
          </span>
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Duration (minutes)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={120}
              value={duration}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setDuration(Number.isNaN(n) ? 0 : n);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            <Timer className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Duration must be 1–120 minutes. Adjacent bookings do not count as overlaps.
      </p>
    </section>
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

function ResultPanel({ result }: { result: AvailabilityResult }) {
  const isOk = result.available;
  return (
    <section
      className={`animate-in rounded-2xl border p-4 sm:p-5 ${
        isOk
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {isOk ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        )}
        <div className="min-w-0">
          <p
            className={`text-base font-semibold ${
              isOk ? "text-emerald-800" : "text-red-800"
            }`}
          >
            {isOk ? "Available" : "Unavailable"}
          </p>
          <p
            className={`mt-0.5 text-sm ${
              isOk ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {result.message}
          </p>
          <p className="mt-1.5 text-xs font-medium text-slate-400">
            Reason code: {result.reasonCode}
          </p>
        </div>
      </div>
    </section>
  );
}

function BookingsList({
  bookings,
}: {
  bookings: ReadonlyArray<{ start: Date; end: Date; label: string }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <CalendarClock className="h-4 w-4 text-blue-600" />
        Existing bookings for Room {ROOM_LABEL}
      </h2>
      <ul className="divide-y divide-slate-100">
        {bookings.map((b, i) => (
          <li key={i} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {b.label}
              </p>
              <p className="text-xs tabular-nums text-slate-500">
                {formatDateTime(b.start)} – {formatDateTime(b.end)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        These bookings are read-only. The checker never adds, edits, or removes
        them.
      </p>
    </section>
  );
}
