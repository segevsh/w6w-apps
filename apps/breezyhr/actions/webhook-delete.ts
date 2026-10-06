import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company, seg } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  endpointId: string;
}

/** `DELETE /company/{id}/webhook_endpoint/{id}` — permanent; answers 200 with a JSON confirmation. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Endpoint",
  description: "Permanently delete a webhook endpoint so it receives no further events.",
  idempotent: false,
  params: [companyIdParam, {
    key: "endpointId",
    label: "Endpoint ID",
    type: "string",
    required: true,
  }],
  output: [
    { key: "success", type: "boolean", label: "Whether the endpoint was deleted" },
    { key: "message", type: "string", label: "Breezy's confirmation" },
    { key: "endpoint_id", type: "string", label: "Deleted endpoint ID" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "DELETE",
      `${company(input.companyId)}/webhook_endpoint/${seg(input.endpointId)}`,
    );
  },
};

export default webhookDelete;
