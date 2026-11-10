import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listModels from "../actions/list-models.ts";

const trigger: TriggerDefinition = {
  key: "new-model",
  title: "New Model",
  description:
    "The run gets each model newly available to the API key (the model list is a bounded catalog; renames and removals are ignored).",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Model ID" },
    { key: "values", type: "object", label: "Model" },
  ],
  sample: {
    change: "added",
    key: "gpt-new",
    values: { id: "gpt-new", object: "model", owned_by: "openai" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await listModels.execute({}, ctx);
    const rows = ((result as { data?: unknown[] }).data ?? []) as Array<
      { id?: string; [key: string]: unknown }
    >;
    return await pollSnapshot({
      state,
      rows: rows.flatMap((row) => row.id ? [{ key: row.id, values: row }] : []),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
