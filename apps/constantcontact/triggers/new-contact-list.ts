import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listContactLists from "../actions/list-contact-lists.ts";

/**
 * Snapshot poll (brief 9.1 c). `list-contact-lists` has no sort argument and the vendor documents no
 * default order, so the account's lists (a small collection, one request of up to 500) are watched
 * as a snapshot. An account with more lists than one page is refused loudly.
 */
const trigger: TriggerDefinition = {
  key: "new-contact-list",
  title: "New Contact List",
  description: "The run gets each contact list newly created in the account.",
  output: [
    { key: "list_id", type: "string", label: "Contact list ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "favorite", type: "boolean", label: "Favorite" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    list_id: "a1b2c3d4-0000-4000-8000-000000000001",
    name: "Newsletter",
    favorite: false,
    created_at: "2026-11-09T10:00:00.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await listContactLists.execute({ limit: 500 }, ctx) as {
      lists?: Array<Record<string, unknown>>;
      next_cursor?: string;
    };
    if (res.next_cursor) {
      throw new Error(
        "the account has more than 500 contact lists: the new-contact-list trigger watches at most 500",
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true },
      rows: (res.lists ?? []).map((l) => ({ key: String(l.list_id), values: l })),
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
