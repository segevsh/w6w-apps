import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/institution-list.ts";
import type { TriggerDefinition } from "@w6w/types";

const trigger: TriggerDefinition = {
  key: "new-institution",
  title: "New Institution",
  description: "The run gets each newly added supported institution.",
  output: [{ key: "change", type: "string", label: "Change" }],
  sample: { change: "added", key: "ins-2", values: { institution_id: "ins-2" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await action.execute(
      { count: 200, offset: 0, countryCodes: "US", query: "" },
      ctx,
    );
    const institutions =
      (result as { institutions?: Array<{ institution_id?: unknown }> }).institutions ?? [];
    return await pollSnapshot({
      state,
      rows: institutions.map((institution) => ({
        key: String(institution.institution_id ?? ""),
        values: institution,
      })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
