import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import listGammaComments from "../actions/list-gamma-comments.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-or-updated-gamma-comment",
  title: "New or Updated Gamma Comment",
  description:
    "The run gets each comment thread on the chosen Gamma that is new or has new activity (an edit or reply), once per change.",
  minIntervalMs: 300_000,
  params: [{ key: "gammaId", label: "Gamma ID", type: "string", required: true }],
  async poll({ state, params }, ctx) {
    const prev = (state ?? {}) as { cursor?: unknown };
    const cursor = typeof prev.cursor === "number" ? prev.cursor : undefined;
    const since = (cursor ?? Date.now()) - OVERLAP_MS;
    const result = await (listGammaComments as unknown as ActionDefinition).execute(
      {
        ...(params as Record<string, unknown>),
        limit: 50,
        updatedSince: new Date(since).toISOString(),
      },
      ctx,
    );
    const items = ((result as { data?: unknown[] }).data ?? []) as Item[];
    const idOf = (i: Item) => String(i.id ?? "") + ":" + String(i.updatedTime ?? "");
    const stampOf = (i: Item): number => Date.parse(String(i.updatedTime ?? ""));
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
    { key: "id", type: "string", label: "Comment ID" },
    { key: "cardId", type: "string", label: "Card ID" },
    { key: "contentText", type: "string", label: "Comment text" },
    { key: "status", type: "string", label: "open or closed" },
    { key: "replies", type: "array", label: "Replies" },
    { key: "createdTime", type: "string", label: "Created" },
    { key: "updatedTime", type: "string", label: "Last modified" },
  ],
  sample: {
    id: "cmt_1",
    cardId: "card_9",
    contentText: "Tighten this headline",
    status: "open",
    replies: [],
    createdTime: "2026-11-09T10:00:00Z",
    updatedTime: "2026-11-09T10:00:00Z",
  },
};

export default trigger;
