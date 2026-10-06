import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  dealUid: string;
}

/** `GET /api/v1/crm/deals/{dealUid}` — Retrieve one deal by Uid. */
const getDeal: ActionDefinition<Input> = {
  key: "get-deal",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Retrieve one deal by Uid.",
  params: [
    {
      key: "dealUid",
      label: "Deal Uid",
      type: "string",
      hint: "The deal's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
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
    return OutsetaClient.fromConnection(ctx).request(`/crm/deals/${pathId(input.dealUid)}`, {
      method: "GET",
    });
  },
};

export default getDeal;
