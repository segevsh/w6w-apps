import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/space-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

interface Params {
  orgId: string;
}

const trigger: TriggerDefinition<Params> = {
  key: "new-space",
  title: "New Workspace",
  description:
    "The run gets each workspace (Podio calls it a space) newly added to the chosen organization. Each check reads the organization's whole workspace list.",
  params: [
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "Numeric org id. Use List Organizations to find it.",
    },
  ],
  output: [
    { key: "space_id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "org_id", type: "number", label: "Organization ID" },
  ],
  sample: { space_id: 5002, name: "Sales", org_id: 21 },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const out = await action.execute({ orgId: params.orgId }, ctx);
    return await snapshotAdded(state, (out as { spaces: unknown[] }).spaces, "space_id") as never;
  },
};

export default trigger;
