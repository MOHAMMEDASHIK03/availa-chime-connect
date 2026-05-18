// Tracks bookings made from this browser (no user account required).
const KEY = "glamup_bookings_v1";

export type LocalBooking = { id: string; createdAt: number };

export function listLocalBookings(): LocalBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalBooking[];
  } catch {
    return [];
  }
}

export function rememberBooking(id: string) {
  if (typeof window === "undefined") return;
  const all = listLocalBookings().filter((b) => b.id !== id);
  all.unshift({ id, createdAt: Date.now() });
  // keep last 10
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 10)));
}
