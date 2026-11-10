import { pollWindow } from "../lib/window.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import transcriptionList from "../actions/transcription-list.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

/** The list holds at most 100 jobs a page; five pages bound one check, the rest resumes next check. */
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-transcription",
  title: "New Transcription",
  description: "The run gets each pre-recorded transcription job created since the last check.",
  minIntervalMs: 300_000,

  poll({ state, params }, ctx) {
    return pollWindow<Item, number>({
      state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (i) => String(i.id ?? ""),
      tsOf: (i) => {
        const ms = Date.parse(String(i.created_at ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, offset, until) {
        // Continuation pages are bounded by the window start so arrivals cannot shift the offset.
        const result = await (transcriptionList as unknown as ActionDefinition).execute(
          {
            ...(params as Record<string, unknown>),
            limit: PAGE_SIZE,
            offset: offset ?? 0,
            afterDate: new Date(since).toISOString(),
            ...(offset === undefined ? {} : { beforeDate: new Date(until).toISOString() }),
          },
          ctx,
        );
        const r = result as { items?: unknown[]; next?: unknown };
        const items = (r.items ?? []) as Item[];
        return {
          items,
          next: r.next && items.length >= PAGE_SIZE ? (offset ?? 0) + PAGE_SIZE : undefined,
        };
      },
    });
  },
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "kind", type: "string", label: "Kind" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    id: "a1b2c3",
    status: "queued",
    kind: "pre-recorded",
    created_at: "2026-11-09T10:00:00Z",
  },
};

export default trigger;
