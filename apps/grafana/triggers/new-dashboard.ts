import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import dashboardList from "../actions/dashboard-list.ts";

const trigger: TriggerDefinition = {
  key: "new-dashboard",
  title: "New Dashboard",
  description: "The run gets dashboards added to the bounded Grafana dashboard collection.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Dashboard UID" },
    { key: "values", type: "object", label: "Dashboard" },
  ],
  sample: { change: "added", key: "dashboard-1", values: { uid: "dashboard-1" } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await dashboardList.execute({ limit: 5000 }, ctx);
    const dashboards = Array.isArray(result) ? result : [];
    return await pollSnapshot({
      state,
      rows: dashboards.map((dashboard) => {
        const row = dashboard as { uid?: unknown; id?: unknown };
        return { key: String(row.uid ?? row.id ?? ""), values: dashboard };
      }),
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
