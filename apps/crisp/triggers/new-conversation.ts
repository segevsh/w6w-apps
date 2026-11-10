import type { TriggerDefinition } from "@w6w/types";
import listConversations from "../actions/list-conversations.ts";
import { clock } from "../lib/triggers.ts";
import { pollWindow, toMs } from "../lib/window.ts";

const PER_PAGE = 50;
/** Look-back before the previous check, so a conversation updated late is still seen. */
const OVERLAP_MS = 120_000;
/** Per-check ceiling: 3 pages of 50; a longer window is resumed on the next check (brief 9.8). */
const MAX_PAGES = 3;
const MAX_EVENTS = 150;
const SEEN_WINDOW = MAX_EVENTS + PER_PAGE;

interface Conversation {
  session_id?: string;
  created_at?: number;
  updated_at?: number;
}

/**
 * Since-filter poll (brief 9.1 b). `filter_date_start` filters on the conversation UPDATE date
 * (https://docs.crisp.chat/references/rest-api/v1/#list-conversations-in-a-website), so each check
 * asks for conversations updated since `cursor - overlap`, keeps only those whose `created_at` is
 * also inside that window (a brand-new conversation), and dedupes by `session_id`. A window longer
 * than `MAX_PAGES` pages is resumed from the persisted page on the next check (brief 9.8); the seed
 * stores `floor = now` and later checks drop conversations stamped before it (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each conversation started since the last check.",
  output: [
    { key: "session_id", type: "string", label: "Conversation ID" },
    { key: "state", type: "string", label: "State" },
    { key: "last_message", type: "string", label: "Last message excerpt" },
    { key: "created_at", type: "number", label: "Created at (ms since epoch)" },
    { key: "updated_at", type: "number", label: "Updated at (ms since epoch)" },
  ],
  sample: {
    session_id: "session_0a1b2c3d",
    state: "unresolved",
    last_message: "Hi, I need help with my order",
    created_at: 1762646400000,
    updated_at: 1762646460000,
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Conversation, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PER_PAGE,
      seenWindow: SEEN_WINDOW,
      idOf: (c) => String(c.session_id ?? ""),
      tsOf: (c) => toMs(c.created_at),
      async load(sinceMs, pos) {
        const pageNumber = pos ?? 1;
        const res = await listConversations.execute(
          {
            pageNumber,
            perPage: PER_PAGE,
            filterDateStart: new Date(sinceMs).toISOString(),
          },
          ctx,
        );
        const all = Array.isArray(res) ? res as Conversation[] : [];
        const items = all.filter((c) => (c.created_at ?? 0) >= sinceMs);
        return {
          items: items,
          next: all.length >= PER_PAGE ? pageNumber + 1 : undefined,
          read: all.length,
        };
      },
    });
  },
};

export default trigger;
