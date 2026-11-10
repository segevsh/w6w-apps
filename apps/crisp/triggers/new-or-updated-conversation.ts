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
  updated_at?: number;
}

/**
 * Since-filter poll (brief 9.1 b). `list-conversations` documents no sort, but Crisp documents
 * `filter_date_start` ("when to start relative to conversation update date",
 * https://docs.crisp.chat/references/rest-api/v1/#list-conversations-in-a-website). Each check asks
 * for conversations updated since `cursor - overlap` and dedupes by `session_id:updated_at`. A
 * window longer than `MAX_PAGES` pages is resumed from the persisted page on the next check (brief
 * 9.8); the seed stores `floor = now` and later checks drop conversations stamped before it (9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-conversation",
  title: "New or Updated Conversation",
  description:
    "The run gets each conversation that was created or had activity since the last check.",
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
      idOf: (c) => `${c.session_id ?? ""}:${c.updated_at ?? ""}`,
      tsOf: (c) => toMs(c.updated_at),
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
        return {
          items: all,
          next: all.length >= PER_PAGE ? pageNumber + 1 : undefined,
          read: all.length,
        };
      },
    });
  },
};

export default trigger;
