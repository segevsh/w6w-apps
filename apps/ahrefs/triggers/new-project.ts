import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/project-list.ts";

const trigger: TriggerDefinition = {
  key: "new-project",
  title: "New Project",
  description: "Emits projects newly added to the bounded account project collection.",
  params: action.params,
  output: [{ key: "key", type: "string", label: "Project ID" }],
  sample: { key: "101", values: { project_id: 101 } },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await action.execute(params, ctx) as { projects?: unknown[] };
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false },
      rows: (result.projects ?? []).map((project) => ({
        key: String(
          (project as { project_id?: unknown; id?: unknown }).project_id ??
            (project as { id?: unknown }).id ?? "",
        ),
        values: project,
      })),
    });
  },
};

export default trigger;
