import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import transcriptionList from "../actions/transcription-list.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-transcription",
  title: "New Transcription",
  description: "The run gets each pre-recorded transcription job created since the last check.",
  minIntervalMs: 300_000,

  async poll({ state, params }, ctx) {
    const prev = (state ?? {}) as { cursor?: unknown };
    const cursor = typeof prev.cursor === "number" ? prev.cursor : undefined;
    const since = (cursor ?? Date.now()) - OVERLAP_MS;
    const result = await (transcriptionList as unknown as ActionDefinition).execute(
      {
        ...(params as Record<string, unknown>),
        limit: 100,
        offset: 0,
        afterDate: new Date(since).toISOString(),
      },
      ctx,
    );
    const items = ((result as { items?: unknown[] }).items ?? []) as Item[];
    const idOf = (i: Item) => String(i.id ?? "");
    const stampOf = (i: Item): number => Date.parse(String(i.created_at ?? ""));
    const { events, nextState } = await pollNewItems<Item>({
      state,
      fetchPage: () => Promise.resolve({ items }),
      idOf,
    });
    // The cursor only moves to a stamp that was actually emitted.
    const stamps = events.map(stampOf).filter((n) => Number.isFinite(n));
    const base = cursor ?? Date.now();
    return { events, nextState: { ...nextState, cursor: Math.max(base, ...stamps) } };
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
