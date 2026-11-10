import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import reservationList from "../actions/reservation-list.ts";

/** Clock seam for the polling triggers. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const PAGE_SIZE = 100;
/** Look-back before the previous check, so a reservation written late is still seen. */
const OVERLAP_MS = 120_000;
/** Per-check ceiling: 3 pages of 100; a longer window is resumed on the next check (brief 9.8). */
const MAX_PAGES = 3;
const MAX_EVENTS = 300;
const SEEN_WINDOW = MAX_EVENTS + PAGE_SIZE;

export interface Reservation {
  reservationID?: string;
  dateCreated?: string;
  dateModified?: string;
  status?: string;
  [key: string]: unknown;
}

/** `YYYY-MM-DD HH:MM:SS` (UTC), the datetime form Cloudbeds' reservation filters take. */
function stamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Since-filter poll (brief 9.1 b) over the existing `reservation-list` action. `filter` is the
 * action's own window parameter: `resultsFrom` (booking date) for new reservations,
 * `modifiedFrom` for new-or-updated ones. A window longer than `MAX_PAGES` pages is resumed from
 * the persisted page number on the next check and the cursor moves only once it drains (brief 9.8);
 * the seed stores `floor = now` and later checks drop reservations stamped before it (brief 9.9).
 */
export function reservationPoll(
  spec: Pick<TriggerDefinition, "key" | "title" | "description" | "output" | "sample"> & {
    filter: "resultsFrom" | "modifiedFrom";
    idOf(r: Reservation): string;
  },
): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx: HookContext) {
      return pollWindow<Reservation, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        tsOf: (r) => toMs(spec.filter === "resultsFrom" ? r.dateCreated : r.dateModified),
        async load(sinceMs, pos) {
          const pageNumber = pos ?? 1;
          const res = await reservationList.execute(
            { [spec.filter]: stamp(sinceMs), pageNumber, pageSize: PAGE_SIZE },
            ctx,
          ) as { data?: Reservation[] };
          const items = Array.isArray(res?.data) ? res.data : [];
          return { items, next: items.length >= PAGE_SIZE ? pageNumber + 1 : undefined };
        },
      });
    },
  };
}

export const reservationOutput = [
  { key: "reservationID", type: "string", label: "Reservation ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "guestName", type: "string", label: "Guest name" },
  { key: "startDate", type: "string", label: "Check-in date" },
  { key: "endDate", type: "string", label: "Check-out date" },
  { key: "dateCreated", type: "string", label: "Booked at" },
  { key: "dateModified", type: "string", label: "Last modified at" },
] as const;

export const reservationSample = {
  reservationID: "1234567890123",
  status: "confirmed",
  guestName: "Ada Lovelace",
  startDate: "2026-12-01",
  endDate: "2026-12-04",
  dateCreated: "2026-11-09 10:00:00",
  dateModified: "2026-11-09 10:00:00",
};
