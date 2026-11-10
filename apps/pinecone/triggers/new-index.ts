import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import indexList from "../actions/index-list.ts";

// Snapshot of `GET /indexes` (brief 9.1c): a project holds at most 200 serverless indexes on the
// largest plan (https://docs.pinecone.io/reference/api/database-limits/object-limits), so the whole
// collection is one bounded response. Added only: a changed index is not a new index.
const list: ActionDefinition = indexList;

const trigger: TriggerDefinition = {
  key: "new-index",
  title: "New Index",
  description: "The run gets each index newly created in the connected Pinecone project.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Index name" },
    { key: "values", type: "object", label: "Index (name, host, dimension, metric, status)" },
  ],
  sample: {
    change: "added",
    key: "products",
    values: {
      name: "products",
      host: "products-abc123.svc.aped-1234-a56b.pinecone.io",
      dimension: 1536,
      metric: "cosine",
    },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await list.execute({}, ctx) as { indexes?: Array<{ name?: unknown }> };
    return await pollSnapshot({
      state,
      rows: (result.indexes ?? []).map((index) => ({
        key: String(index.name ?? ""),
        values: index,
      })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
