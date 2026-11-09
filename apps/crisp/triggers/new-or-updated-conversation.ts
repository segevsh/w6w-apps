import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listConversations from "../actions/list-conversations.ts";
import { clock } from "../lib/triggers.ts";

const PER_PAGE = 50;
/** Look-back before the previous check, so a conversation updated late is still seen. */
const OVERLAP_MS = 120_000;

interface Conversation {
  session_id?: string;
  updated_at?: number;
}

/**
 * Since-filter poll (brief 9.1 b). `list-conversations` documents no sort, but Crisp documents
 * `filter_date_start` ("when to start relative to conversation update date",
 * https://docs.crisp.chat/references/rest-api/v1/#list-conversations-in-a-website). Each check asks
 * for conversations updated since `cursor - overlap` and dedupes by `session_id:updated_at`.
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
  async poll({ state }, ctx) {
    const now = clock.now();
    const prior = state as { seeded?: boolean; cursor?: number } | undefined;
    const since = typeof prior?.cursor === "number" ? prior.cursor : now;
    const filterDateStart = new Date(since - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<Conversation>({
      state,
      maxPages: 3,
      idOf: (c) => `${c.session_id ?? ""}:${c.updated_at ?? ""}`,
      async fetchPage(token) {
        const pageNumber = token === undefined ? 1 : Number(token);
        const res = await listConversations.execute(
          { pageNumber, perPage: PER_PAGE, filterDateStart },
          ctx,
        );
        const items = Array.isArray(res) ? res as Conversation[] : [];
        return {
          items,
          nextPageToken: items.length >= PER_PAGE ? String(pageNumber + 1) : undefined,
        };
      },
    });
    return { events, nextState: { ...nextState, cursor: now } };
  },
};

export default trigger;
