import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/index-list.ts";

const trigger: TriggerDefinition = {
  key: "new-index",
  title: "New Index",
  description: "Emits indices newly added to this application's bounded index collection.",
  params: [],
  output: [{ key: "key", type: "string", label: "Index name" }],
  sample: { key: "products", values: { name: "products" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const first = await action.execute({ page: 0, hitsPerPage: 1000 }, ctx) as {
      items?: unknown[];
      nbPages?: number;
    };
    const rows = [...(first.items ?? [])];
    for (let page = 1; page < Number(first.nbPages ?? 1); page++) {
      const result = await action.execute({ page, hitsPerPage: 1000 }, ctx) as {
        items?: unknown[];
      };
      rows.push(...(result.items ?? []));
    }
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false },
      rows: rows.map((index) => ({
        key: String((index as { name?: unknown }).name ?? ""),
        values: index,
      })),
    });
  },
};

export default trigger;
