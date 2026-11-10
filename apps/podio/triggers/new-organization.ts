import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/org-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-organization",
  title: "New Organization",
  description:
    "The run gets each Podio organization the connected user newly becomes a member of. Needs a user connection, not an app connection.",
  output: [
    { key: "org_id", type: "number", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { org_id: 22, name: "Acme Group", spaces: [] },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await action.execute({}, ctx);
    return await snapshotAdded(
      state,
      (out as { organizations: unknown[] }).organizations,
      "org_id",
    ) as never;
  },
};

export default trigger;
