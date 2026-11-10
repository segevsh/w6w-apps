import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/collection-list.ts";

/** `GET /collections` returns every root collection in one response, in an order the docs describe as the user's manual sort (not creation time), so the whole set is diffed. */
const trigger: TriggerDefinition = {
  key: "new-collection",
  title: "New Collection",
  description: "The run gets each root collection created since the last check.",
  output: [{ key: "_id", type: "number", label: "Collection ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }],
  sample: { _id: 42, title: "Reading" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await action.execute({}, ctx) as unknown;

    const rows = ((result as { items?: unknown[] }).items ?? []).map((item) => ({
      key: String((item as { _id: unknown })._id),
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
