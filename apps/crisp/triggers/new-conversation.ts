import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listConversations from "../actions/list-conversations.ts";
import { clock } from "../lib/triggers.ts";

const PER_PAGE = 50;
/** Look-back before the previous check, so a conversation updated late is still seen. */
const OVERLAP_MS = 120_000;

interface Conversation {
  session_id?: string;
  created_at?: number;
  updated_at?: number;
}

/**
 * Since-filter poll (brief 9.1 b). `filter_date_start` filters on the conversation UPDATE date
 * (https://docs.crisp.chat/references/rest-api/v1/#list-conversations-in-a-website), so each check
 * asks for conversations updated since `cursor - overlap`, keeps only those whose `created_at` is
 * also inside that window (a brand-new conversation), and dedupes by `session_id`.
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
  async poll({ state }, ctx) {
    const now = clock.now();
    const prior = state as { seeded?: boolean; cursor?: number } | undefined;
    const since = typeof prior?.cursor === "number" ? prior.cursor : now;
    const filterDateStart = new Date(since - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<Conversation>({
      state,
      maxPages: 3,
      idOf: (c) => String(c.session_id ?? ""),
      async fetchPage(token) {
        const pageNumber = token === undefined ? 1 : Number(token);
        const res = await listConversations.execute(
          { pageNumber, perPage: PER_PAGE, filterDateStart },
          ctx,
        );
        const all = Array.isArray(res) ? res as Conversation[] : [];
        const items = all.filter((c) => (c.created_at ?? 0) >= since - OVERLAP_MS);
        return {
          items,
          nextPageToken: all.length >= PER_PAGE ? String(pageNumber + 1) : undefined,
        };
      },
    });
    return { events, nextState: { ...nextState, cursor: now } };
  },
};

export default trigger;
