import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the webhooks registered for the company. Webhook responses do not carry a signing secret.",
  params: [...pageParams],
  output: [{ key: "list", type: "array", label: "Webhooks on this page" }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/webhooks", {
      query: { page: input.page, pageSize: input.pageSize },
    });
  },
};

export default webhookList;
