import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGroups from "../actions/list-groups.ts";

const MAX_ROWS = 5000;

const trigger: TriggerDefinition = {
  key: "new-group",
  title: "New Group",
  description: "The run gets each group newly added to the folk network.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Group ID" },
    { key: "values", type: "object", label: "Group" },
  ],
  sample: {
    change: "added",
    key: "grp_123",
    values: { id: "grp_123", networkId: "net_123", name: "New leads" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await listGroups.execute({}, ctx) as {
      groups?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.groups ?? []).flatMap((group) =>
        group.id ? [{ key: group.id, values: group }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: MAX_ROWS,
    });
  },
};

export default trigger;
