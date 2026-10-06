import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/projects/{id}` — Fetch one campaign by ID. */
interface Input {
  id: number;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch one campaign by ID.",
  params: [idParam("id", "Campaign ID")],
  output: [{ key: "data", type: "object", label: "The campaign" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/projects/${encodeId(input.id)}`);
    return { data };
  },
};

export default campaignGet;
