import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import phaseList from "../actions/phase-list.ts";

/**
 * `phase-list`: `{ pipe(id) { phases { ... } } }` returns every phase of one pipe in a single query (no paging argument).
 * Bounded: a pipe has a handful of phases, all returned in one query. Additions only (renames and removals are ignored).
 */
const trigger: TriggerDefinition<{ pipeId: string }> = {
  key: "new-phase",
  title: "New Phase",
  description:
    "The run gets each phase newly added to the chosen Pipefy pipe (renames, reordering and removals are ignored).",
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
  ],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Phase ID" },
    { key: "values", type: "object", label: "Phase" },
  ],
  sample: {
    change: "added",
    key: "302345001",
    values: { id: "302345001", name: "Doing" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await phaseList.execute({ pipeId: params.pipeId }, ctx) as {
      phases?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.phases ?? []).flatMap((row) =>
        row.id ? [{ key: String(row.id), values: row }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
