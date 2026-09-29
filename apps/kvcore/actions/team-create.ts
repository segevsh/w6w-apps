import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { entityBody, entityFields } from "../lib/params.ts";

/** `POST /v2/public/team` — create a new team. Requires an All-scoped token. */
const teamCreate: ActionDefinition<Record<string, unknown>> = {
  key: "team-create",
  type: "perform",
  resource: "team",
  title: "Create Team",
  description: "Create a new team on the account.",
  idempotent: false,
  params: entityFields("team", { create: true }),
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json("/team", { method: "POST", body: entityBody(input) });
  },
};

export default teamCreate;
