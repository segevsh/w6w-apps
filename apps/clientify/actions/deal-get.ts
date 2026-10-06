import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/deals/{dealId}/` — Get one deal by id.
 */
interface Input {
  dealId: string;
}

const dealGet: ActionDefinition<Input, unknown> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Get one deal by id.",
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Deal name" },
    { key: "status_desc", type: "string", label: "Deal status" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/${encodeURIComponent(input.dealId)}/`, { method: "GET" });
  },
};

export default dealGet;
