export interface Booking {
  start: Date;
  end: Date;
  label: string;
}

export const ROOM_LABEL = "A-101";

export const ROOM_BOOKINGS: Booking[] = [
  {
    start: new Date("2026-12-01T10:00:00"),
    end: new Date("2026-12-01T11:00:00"),
    label: "Team standup",
  },
  {
    start: new Date("2026-12-01T13:00:00"),
    end: new Date("2026-12-01T14:30:00"),
    label: "Workshop",
  },
];

export function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
