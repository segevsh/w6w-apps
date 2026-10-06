import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
  name?: string;
  active?: boolean;
}

/** `PATCH /teams/{uuid}` */
const teamUpdate: ActionDefinition<Input> = {
  key: "team-update",
  type: "perform",
  resource: "team",
  title: "Update Team",
  description: "Rename or (de)activate a team of your workspace.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Team UUID",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Must be unique within the workspace.",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint:
        "Defaults to true on creation. A team can only be deactivated once it has no active users.",
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
    const res = await new LeexiClient(ctx).request("PATCH", `/teams/${seg(input.uuid)}`, {
      body: compact({ name: input.name, active: input.active }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default teamUpdate;
