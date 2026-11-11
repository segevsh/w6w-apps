import type { TriggerDefinition } from "@w6w/types";
import messagesList from "../actions/conversation-messages-list.ts";
import { pollWindow, toMs } from "../lib/window.ts";

type Message = { id?: string; created_at?: string };

const OVERLAP_MS = 120_000;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const SEEN_WINDOW = 2000;

/**
 * Shape (b), through `conversation-messages-list`. `GET /conversations/{id}/messages` documents a
 * `created_after` filter and a `limit` of up to 100 but no sort order
 * (https://developers.superchat.com/reference/get_conversations-id-messages), so each check reads
 * `created_after = cursor - 120 s` and follows `nextCursor` for at most `MAX_PAGES` pages; a longer
 * window is resumed from the persisted cursor on the next check (brief 9.8). The seed reads nothing
 * and stores `floor = now`, so older messages never fire (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-conversation-message",
  title: "New Conversation Message",
  description: "The run gets each new message in the selected Superchat conversation.",
  type: "poll",
  minIntervalMs: 300_000,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      hint: "Leave empty for both directions.",
      options: [{ value: "INBOUND", label: "Inbound" }, { value: "OUTBOUND", label: "Outbound" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "conversation_id", type: "string", label: "Conversation ID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "content", type: "object", label: "Content" },
  ],
  sample: {
    id: "mt_1",
    conversation_id: "cv_1",
    direction: "inbound",
    created_at: "2026-11-10T09:00:00Z",
    content: { type: "text", body: "Hello" },
  },
  poll({ params, state }, ctx) {
    const p = params as { conversationId?: string; direction?: string };
    return pollWindow<Message, string>({
      state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      seedRead: false,
      idOf: (item) => String(item.id),
      tsOf: (item) => toMs(item.created_at),
      async load(sinceMs, after) {
        const out = await messagesList.execute(
          {
            conversationId: String(p.conversationId),
            direction: p.direction || undefined,
            createdAfter: new Date(sinceMs).toISOString(),
            limit: PAGE_SIZE,
            after,
          },
          ctx,
        ) as { results?: Message[]; nextCursor?: string | null };
        return { items: out.results ?? [], next: out.nextCursor || undefined };
      },
    });
  },
};

export default trigger;
