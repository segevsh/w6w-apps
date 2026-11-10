import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import collectionList from "../actions/collection-list.ts";

/** A Qdrant instance returns its complete collection directory in one GET /collections response. */
const trigger: TriggerDefinition = {
  key: "new-collection",
  title: "New Collection",
  description: "The run gets each collection newly added to this Qdrant instance.",
  output: [{ key: "name", type: "string", label: "Collection name" }],
  sample: { name: "knowledge-base" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await collectionList.execute({}, ctx) as {
      collections?: Array<{ name?: unknown }>;
    };
    const collections = result.collections ?? [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: collections.flatMap((collection) =>
        typeof collection.name === "string" && collection.name
          ? [{ key: collection.name, values: collection }]
          : []
      ),
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
