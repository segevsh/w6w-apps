import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `DELETE /teams/{uuid}` */
const teamDelete: ActionDefinition<Input> = {
  key: "team-delete",
  type: "perform",
  resource: "team",
  title: "Delete Team",
  description: "Delete a team of your workspace. A team that still has users answers 422.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Team UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("DELETE", `/teams/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default teamDelete;
