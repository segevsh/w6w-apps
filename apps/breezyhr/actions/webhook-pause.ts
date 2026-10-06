import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company, seg } from "../lib/client.ts";
import { companyIdParam, WEBHOOK_OUTPUT } from "../lib/params.ts";

interface Input {
  companyId: string;
  endpointId: string;
}

/** `POST /company/{id}/webhook_endpoint/{id}/pause` — returns the updated endpoint. */
const webhookPause: ActionDefinition<Input> = {
  key: "webhook-pause",
  type: "perform",
  resource: "webhook",
  title: "Pause Webhook Endpoint",
  description:
    "Pause a webhook endpoint: deliveries stop, the configuration is kept (status paused, enabled false).",
  idempotent: true,
  params: [companyIdParam, {
    key: "endpointId",
    label: "Endpoint ID",
    type: "string",
    required: true,
  }],
  output: WEBHOOK_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "POST",
      `${company(input.companyId)}/webhook_endpoint/${seg(input.endpointId)}/pause`,
    );
  },
};

export default webhookPause;
