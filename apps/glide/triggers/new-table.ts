import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import tableList from "../actions/table-list.ts";

const trigger: TriggerDefinition = {
  key: "new-table",
  title: "New Big Table",
  description: "The run gets each Big Table newly available to the Glide team.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Table ID" },
    { key: "values", type: "object", label: "Big Table" },
  ],
  sample: { change: "added", key: "tbl_123", values: { id: "tbl_123", name: "Leads" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await tableList.execute({}, ctx) as {
      data?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.data ?? []).flatMap((table) =>
        table.id ? [{ key: table.id, values: table }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
