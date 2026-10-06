import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company, seg } from "../lib/client.ts";
import { companyIdParam, WEBHOOK_OUTPUT } from "../lib/params.ts";

interface Input {
  companyId: string;
  endpointId: string;
}

/** `POST /company/{id}/webhook_endpoint/{id}/resume` — returns the updated endpoint. */
const webhookResume: ActionDefinition<Input> = {
  key: "webhook-resume",
  type: "perform",
  resource: "webhook",
  title: "Resume Webhook Endpoint",
  description:
    "Resume a paused or auto-disabled webhook endpoint, clearing the failure count and auto-disable state.",
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
      `${company(input.companyId)}/webhook_endpoint/${seg(input.endpointId)}/resume`,
    );
  },
};

export default webhookResume;
