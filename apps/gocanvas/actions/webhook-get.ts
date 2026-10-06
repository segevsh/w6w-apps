import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  webhookId: number;
}

const webhookGet: ActionDefinition<Input> = {
  key: "webhook-get",
  type: "read",
  resource: "webhook",
  title: "Get Webhook",
  description: "Fetch one webhook of a form.",
  params: [
    idParam("formId", "Form ID"),
    idParam("webhookId", "Webhook ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The webhook" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookId)}`,
    );
  },
};

export default webhookGet;
