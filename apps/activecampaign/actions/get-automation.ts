import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  automationId: string;
}

const getAutomation: ActionDefinition<Input> = {
  key: "get-automation",
  type: "read",
  resource: "automation",
  title: "Get Automation",
  description: "Retrieve a single automation by ID.",
  params: [
    { key: "automationId", label: "Automation ID", type: "string", required: true },
  ],
  output: [
    { key: "automation", type: "object", label: "Automation" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request(`/automations/${input.automationId}`);
  },
};

export default getAutomation;
