import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import workspaceList from "../actions/workspace-list.ts";

const trigger: TriggerDefinition = {
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each newly available Zoho Bookings workspace.",
  output: [{ key: "id", type: "string", label: "Workspace ID" }],
  sample: { id: "workspace-1", name: "Main office" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await workspaceList.execute({}, ctx) as unknown as {
      data?: Array<Record<string, unknown>>;
    };
    const { events, nextState } = await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false, removed: false },
      rows: (result.data ?? []).map((item) => ({ key: String(item.id ?? ""), values: item })),
    });
    return { events: events.map((event) => event.values), nextState };
  },
};
export default trigger;
