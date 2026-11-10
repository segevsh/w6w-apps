import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import recordingList from "../actions/recording-list.ts";

/**
 * A recording is listed by its meeting's `start_datetime`, which is earlier than the moment it
 * becomes available, so the look-back covers a long meeting plus processing.
 */
export const OVERLAP_MS = 24 * 3_600_000;
const MAX_PAGES = 5;
const MAX_EVENTS = 500;
const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

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
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const prior = (state ?? {}) as { cursor?: unknown };
    const since = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
    const filterAfterDatetime = new Date(since - OVERLAP_MS).toISOString();
    let complete = true;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      seenWindow: SEEN_WINDOW,
      maxEvents: MAX_EVENTS,
      idOf: (r) => String((r as { id?: unknown }).id ?? ""),
      // No order is documented, so every page of the window is read and the id dedupe decides.
      async fetchPage() {
        const all: unknown[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await recordingList.execute({ filterAfterDatetime, cursor }, ctx) as Page;
          all.push(...(res.recordings ?? []));
          if (!res.cursor) return { items: all.reverse() };
          cursor = res.cursor;
        }
        complete = false;
        return { items: all.reverse() };
      },
    });
    return { events, nextState: { ...nextState, cursor: complete ? checkedAt : since } };
  },
};

export default trigger;
