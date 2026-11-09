import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import reservationList from "../actions/reservation-list.ts";

/** Clock seam for the polling triggers. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const PAGE_SIZE = 100;
/** Look-back before the previous check, so a reservation written late is still seen. */
const OVERLAP_MS = 120_000;

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
 * `modifiedFrom` for new-or-updated ones. Each check asks for reservations since
 * `cursor - overlap` and dedupes with `pollNewItems`.
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
    async poll({ state }, ctx: HookContext) {
      const now = clock.now();
      const prior = state as { seeded?: boolean; cursor?: number } | undefined;
      const since = typeof prior?.cursor === "number" ? prior.cursor : now;
      const from = stamp(since - OVERLAP_MS);
      const { events, nextState } = await pollNewItems<Reservation>({
        state,
        maxPages: 3,
        idOf: spec.idOf,
        async fetchPage(token) {
          const pageNumber = token === undefined ? 1 : Number(token);
          const res = await reservationList.execute(
            { [spec.filter]: from, pageNumber, pageSize: PAGE_SIZE },
            ctx,
          ) as { data?: Reservation[] };
          const items = Array.isArray(res?.data) ? res.data : [];
          return {
            items,
            nextPageToken: items.length >= PAGE_SIZE ? String(pageNumber + 1) : undefined,
          };
        },
      });
      return { events, nextState: { ...nextState, cursor: now } };
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
