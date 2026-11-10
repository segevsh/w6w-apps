import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import tableList from "../actions/table-list.ts";

/**
 * `table-list`: `{ organization(id) { tables { edges { node } } } }` returns the organization's tables in one query.
 * Bounded: an organization has far fewer tables than records. Additions only (renames and removals are ignored).
 */
const trigger: TriggerDefinition<{ organizationId: string }> = {
  key: "new-table",
  title: "New Database Table",
  description:
    "The run gets each Database Table newly created in the chosen Pipefy organization (renames and removals are ignored).",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Table ID" },
    { key: "values", type: "object", label: "Table" },
  ],
  sample: {
    change: "added",
    key: "ZtEdWh",
    values: { id: "ZtEdWh", name: "Customers" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await tableList.execute({ organizationId: params.organizationId }, ctx) as {
      tables?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.tables ?? []).flatMap((row) =>
        row.id ? [{ key: String(row.id), values: row }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
