import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  max?: number;
}

const listTeams: ActionDefinition<Input> = {
  key: "list-teams",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List teams the connected person belongs to.",
  params: [
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/teams", {
      query: { max: input.max },
    });
    return res.items ?? [];
  },
};

export default listTeams;
