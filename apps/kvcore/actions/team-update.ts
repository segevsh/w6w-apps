import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { entityBody, entityFields } from "../lib/params.ts";

interface Input extends Record<string, unknown> {
  team_id: string;
}

/**
 * `PUT /v2/public/team/{team_id}` — update an existing team.
 *
 * Unlike `office-update`, the vendor's schema marks `name` required even on
 * update — this app mirrors that rather than relaxing it.
 */
const teamUpdate: ActionDefinition<Input> = {
  key: "team-update",
  type: "perform",
  resource: "team",
  title: "Update Team",
  description: "Update fields on an existing team. The vendor requires `name` even on update.",
  idempotent: true,
  params: [
    { key: "team_id", label: "Team ID", type: "string", required: true },
    ...entityFields("team", { create: false }),
  ],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const { team_id, ...fields } = input;
    return await new KvCoreClient(ctx).json(`/team/${encodeURIComponent(team_id)}`, {
      method: "PUT",
      body: entityBody(fields),
    });
  },
};

export default teamUpdate;
