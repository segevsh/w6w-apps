import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import listGammaComments from "../actions/list-gamma-comments.ts";
import { pollWindow, toMs } from "../lib/window.ts";

/** Re-read this much before the cursor so a record stamped just before the last check is not lost. */
const OVERLAP_MS = 120_000;
/** Per-check ceiling: 5 pages of 50; a longer window is resumed on the next check (brief 9.8). */
const MAX_PAGES = 5;
const PAGE_SIZE = 50;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

type Item = Record<string, unknown>;

const trigger: TriggerDefinition = {
  key: "new-or-updated-gamma-comment",
  title: "New or Updated Gamma Comment",
  description:
    "The run gets each comment thread on the chosen Gamma that is new or has new activity (an edit or reply), once per change.",
  minIntervalMs: 300_000,
  params: [{ key: "gammaId", label: "Gamma ID", type: "string", required: true }],
  poll({ state, params }, ctx) {
    // The window's `after` cursor is persisted when it holds more than MAX_PAGES pages and the
    // cursor moves only once it drains (brief 9.8); the seed stores `floor = now` and later checks
    // drop comments last modified before it (brief 9.9).
    return pollWindow<Item, string>({
      state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (i) => String(i.id ?? "") + ":" + String(i.updatedTime ?? ""),
      tsOf: (i) => toMs(i.updatedTime),
      async load(sinceMs, after) {
        const result = await (listGammaComments as unknown as ActionDefinition).execute(
          {
            ...(params as Record<string, unknown>),
            limit: PAGE_SIZE,
            updatedSince: new Date(sinceMs).toISOString(),
            ...(after ? { after } : {}),
          },
          ctx,
        ) as { data?: Item[]; hasMore?: boolean; nextCursor?: string | null };
        return {
          items: result.data ?? [],
          next: result.hasMore && result.nextCursor ? result.nextCursor : undefined,
        };
      },
    });
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
