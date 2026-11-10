import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/app-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

interface Params {
  spaceId: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-app",
  title: "New App",
  description:
    "The run gets each Podio app (record type) newly added to the chosen workspace. A workspace holds a handful of apps, so each check reads the whole list.",
  params: [
    {
      key: "spaceId",
      label: "Workspace (Space) ID",
      type: "string",
      required: true,
      hint: "Numeric space id. List Organizations returns the spaces you belong to.",
    },
  ],
  output: [
    { key: "app_id", type: "number", label: "App ID" },
    { key: "space_id", type: "number", label: "Workspace ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "config", type: "object", label: "Configuration" },
  ],
  sample: { app_id: 31001, space_id: 5001, status: "active", config: { name: "Leads" } },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const out = await action.execute({ spaceId: params.spaceId }, ctx);
    return await snapshotAdded(state, (out as { apps: unknown[] }).apps, "app_id") as never;
  },
};

export default trigger;
