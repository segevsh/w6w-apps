import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  planUid: string;
}

/** `GET /api/v1/billing/plans/{planUid}` — Retrieve one plan by Uid. */
const getPlan: ActionDefinition<Input> = {
  key: "get-plan",
  type: "read",
  resource: "billing",
  title: "Get Plan",
  description: "Retrieve one plan by Uid.",
  params: [
    {
      key: "planUid",
      label: "Plan Uid",
      type: "string",
      hint: "The plan's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/plans/${pathId(input.planUid)}`, {
      method: "GET",
    });
  },
};

export default getPlan;
