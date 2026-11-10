import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

const trigger: TriggerDefinition = {
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly visible to the WakaTime user.",
  output: [{ key: "id", type: "string", label: "Project ID" }],
  sample: { id: "project-sample", name: "Example project" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await projectList.execute({}, ctx) as { data?: unknown[] };
    const rows = (out.data ?? []).map((value) => ({
      key: String(
        (value as { id?: unknown; name?: unknown }).id ?? (value as { name?: unknown }).name ?? "",
      ),
      values: value,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
