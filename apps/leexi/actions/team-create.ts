import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient } from "../lib/client.ts";

interface Input {
  name: string;
  active?: boolean;
}

/** `POST /teams` */
const teamCreate: ActionDefinition<Input> = {
  key: "team-create",
  type: "perform",
  resource: "team",
  title: "Create Team",
  description: "Create a team in your workspace.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
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
    const res = await new LeexiClient(ctx).request("POST", "/teams", {
      body: compact({ name: input.name, active: input.active }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default teamCreate;
