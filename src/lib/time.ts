export function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface Booking {
  start: number;
  end: number;
  label: string;
}

export const ROOM_BOOKINGS: Booking[] = [
  { start: 480, end: 540, label: "Morning Lecture" },
  { start: 600, end: 660, label: "Study Group" },
  { start: 780, end: 870, label: "Faculty Meeting" },
  { start: 960, end: 1020, label: "Lab Session" },
  { start: 1140, end: 1200, label: "Evening Tutorial" },
];
