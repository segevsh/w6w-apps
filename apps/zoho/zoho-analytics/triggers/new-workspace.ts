import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import workspaceListOwned from "../actions/workspace-list-owned.ts";

const trigger: TriggerDefinition = {
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each Zoho Analytics workspace newly owned by the connection.",
  output: [{ key: "workspaceId", type: "string", label: "Workspace ID" }],
  sample: { workspaceId: "workspace-1", orgId: "organization-1" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await workspaceListOwned.execute({}, ctx) as {
      workspaces?: Array<Record<string, unknown>>;
    };
    const rows = (result.workspaces ?? []).map((workspace) => ({
      key: String(workspace.workspaceId ?? workspace.id ?? ""),
      values: workspace,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      maxRows: 5000,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
