import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  webhookId: number;
}

const webhookTest: ActionDefinition<Input> = {
  key: "webhook-test",
  type: "perform",
  resource: "webhook",
  title: "Test Webhook",
  description:
    "Send a test payload to the webhook's URL and report the response code and body the endpoint gave back.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    idParam("webhookId", "Webhook ID"),
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The test result: message, response_code, response_body, test_payload",
    },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookId)}/test`,
      { method: "POST" },
    );
  },
};

export default webhookTest;
