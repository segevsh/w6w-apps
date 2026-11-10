import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/chat-list.ts";

/** Pushbullet lists chats most-recently-MODIFIED first (docs.pushbullet.com, Syncing Changes), so list order cannot tell a new chat from an edited one. Chats are a person's contacts (the list limit is 500), so the whole set is diffed instead. */
const trigger: TriggerDefinition = {
  key: "new-chat",
  title: "New Chat",
  description: "The run gets each chat created since the last check.",
  output: [{ key: "iden", type: "string", label: "Chat ID" }, {
    key: "with",
    type: "object",
    label: "The other party (name, email)",
  }],
  sample: { iden: "chat-1", with: { name: "Ada", email: "ada@example.com" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await action.execute({ active: true, limit: 500 }, ctx) as unknown;
    if ((result as { cursor?: string }).cursor) {
      throw new Error("New Chat: more than 500 chats; the snapshot cap is one page of 500");
    }
    const rows = ((result as { chats?: unknown[] }).chats ?? []).map((item) => ({
      key: String((item as { iden: string }).iden),
      values: item,
    }));
    // Added only: an edited or removed record is not a "new" record, so it never fires.
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
