import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGuides from "../actions/list-guides.ts";

const trigger: TriggerDefinition = {
  key: "new-guide",
  title: "New Guide",
  description:
    "The run gets each Pendo guide newly created in the subscription (renames and removals are ignored).",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Guide ID" },
    { key: "values", type: "object", label: "Guide" },
  ],
  sample: {
    change: "added",
    key: "guide-abc",
    values: { id: "guide-abc", name: "Welcome tour", state: "draft" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await listGuides.execute({}, ctx);
    const rows = ((result as { guides?: unknown[] }).guides ?? []) as Array<
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
