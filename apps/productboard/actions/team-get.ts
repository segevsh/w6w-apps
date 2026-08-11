import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";

/**
 * `GET /v2/teams/{id}` — one team.
 *
 * Its members are a separate call (`team-member-list`), not an embedded array —
 * membership paginates independently of the team.
 */
interface Input {
  teamId: string;
}

const teamGet: ActionDefinition<Input, DataResult> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get team",
  description: "Retrieve one team by ID. Members are a separate call.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      placeholder: "123e4567-e89b-12d3-a456-426614174000",
      hint: "UUID from a List teams result, or from an entity's `teams[].id`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Team" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(`/teams/${encodeId(input.teamId)}`);
    return { data };
  },
};

export default teamGet;
