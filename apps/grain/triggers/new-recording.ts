import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import recordingList from "../actions/recording-list.ts";

/**
 * A recording is listed by its meeting's `start_datetime`, which is earlier than the moment it
 * becomes available, so the look-back covers a long meeting plus processing.
 */
export const OVERLAP_MS = 24 * 3_600_000;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

type Rec = { id?: unknown; start_datetime?: unknown };

interface Page {
  recordings?: unknown[];
  cursor?: string | null;
}

const trigger: TriggerDefinition = {
  key: "new-recording",
  title: "New Recording",
  description: "The run gets each newly available meeting recording.",
  output: [
    { key: "id", type: "string", label: "Recording ID" },
    { key: "start_datetime", type: "string", label: "Start datetime" },
  ],
  sample: { id: "recording-1", start_datetime: "2026-11-09T09:30:00Z" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Rec, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (r) => String(r.id ?? ""),
      // The meeting's start time is the only timestamp a recording carries (see README).
      tsOf: (r) => {
        const ms = Date.parse(String(r.start_datetime ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, cursor) {
        const res = await recordingList.execute({
          filterAfterDatetime: new Date(since).toISOString(),
          cursor,
        }, ctx) as Page;
        return { items: (res.recordings ?? []) as Rec[], next: res.cursor || undefined };
      },
    });
  },
};

export default trigger;
