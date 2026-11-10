import type { TriggerDefinition } from "@w6w/types";
import bookingGetMany from "../actions/booking-get-many.ts";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";
import { pollSince } from "../lib/since-poll.ts";

const PAGE_SIZE = 100; // the API's own maximum for `on_page` (bigger values are reduced to 100)
const DAY_MS = 86_400_000;

/** Calendar date `YYYY-MM-DD` of an instant in an IANA time zone. */
function dateIn(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Offset (ms, local minus UTC) of a time zone at an instant. */
function offsetAt(ms: number, timeZone: string): number {
  const p: Record<string, number> = {};
  for (
    const x of new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(new Date(ms))
  ) {
    if (x.type !== "literal") p[x.type] = Number(x.value);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(ms / 1000) * 1000;
}

/** `YYYY-MM-DD HH:MM:SS` wall-clock time in `timeZone` -> epoch ms (NaN when unparseable). */
export function zonedToMs(text: unknown, timeZone: string): number {
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):(\d\d)/.exec(String(text));
  if (!m) return NaN;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return wall - offsetAt(wall - offsetAt(wall, timeZone), timeZone);
}

/** The company zone, or UTC when it is unset or not an IANA name this runtime knows. */
export function zoneOf(timezone: unknown): string {
  if (typeof timezone !== "string" || timezone.trim() === "") return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone.trim() });
    return timezone.trim();
  } catch {
    return "UTC";
  }
}

interface Page {
  data?: unknown[];
  metadata?: { pages_count?: number };
}

/**
 * `GET /admin/bookings` has no sort order and only a day-granular `filter[record_date_from]` /
 * `filter[record_date_to]` in the COMPANY time zone (read from `GET /admin/company/info`). The
 * window is asked one day wider on each side and every row is kept or dropped by its own
 * `record_date`, read in that zone (brief §9.1 b, §9.8, §9.9). A booking carries no edit stamp, so
 * there is no "new or updated" trigger. A company with no time zone set is read as UTC.
 */
const trigger: TriggerDefinition = {
  key: "new-booking",
  title: "New Booking",
  description: "The run gets each newly created booking.",
  output: [
    { key: "id", type: "number", label: "Booking ID" },
    { key: "code", type: "string", label: "Booking code" },
    { key: "start_datetime", type: "string", label: "Start" },
    { key: "record_date", type: "string", label: "Created at" },
  ],
  sample: {
    id: 12,
    code: "ABC123",
    status: "confirmed",
    start_datetime: "2026-11-12 10:00:00",
    record_date: "2026-11-09 12:00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => {
    let zone = "UTC";
    return pollSince<unknown>({
      state,
      idOf: (b) => String((b as { id?: unknown }).id ?? ""),
      stampOf: (b) => zonedToMs((b as { record_date?: unknown }).record_date, zone),
      async fetchPage(win, pos) {
        const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
        const info = await client.request<{ timezone?: string | null }>("/admin/company/info");
        zone = zoneOf(info?.timezone);
        const page = Number(pos ?? 1);
        const res = await bookingGetMany.execute({
          page,
          onPage: PAGE_SIZE,
          recordDateFrom: dateIn(Date.parse(win.since) - DAY_MS, zone),
          recordDateTo: dateIn(Date.parse(win.until) + DAY_MS, zone),
        }, ctx) as unknown[] | Page;
        const items = Array.isArray(res) ? res : res.data ?? [];
        const more = Array.isArray(res) || !res.metadata?.pages_count
          ? items.length >= PAGE_SIZE
          : page < res.metadata.pages_count;
        return { items, next: more ? page + 1 : undefined };
      },
    });
  },
};

export default trigger;
