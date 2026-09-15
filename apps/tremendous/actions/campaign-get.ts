import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/** `GET /campaigns/{id}` — one campaign's products, look and feel. */
interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Retrieve one campaign by ID.",
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [{ key: "campaign", type: "object", label: "The campaign" }],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ campaign: unknown }>(
      `/campaigns/${encodeURIComponent(input.id)}`,
    );
    return body.campaign;
  },
};

export default campaignGet;
