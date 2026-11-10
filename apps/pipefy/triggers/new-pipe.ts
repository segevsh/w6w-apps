import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import pipeList from "../actions/pipe-list.ts";

const trigger: TriggerDefinition<{ organizationId: string }> = {
  key: "new-pipe",
  title: "New Pipe",
  description:
    "The run gets each pipe newly created in the chosen Pipefy organization (renames and removals are ignored).",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Pipe ID" },
    { key: "values", type: "object", label: "Pipe" },
  ],
  sample: {
    change: "added",
    key: "302345678",
    values: { id: "302345678", name: "Hiring" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await pipeList.execute({ organizationId: params.organizationId }, ctx) as {
      pipes?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.pipes ?? []).flatMap((pipe) => pipe.id ? [{ key: pipe.id, values: pipe }] : []),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
