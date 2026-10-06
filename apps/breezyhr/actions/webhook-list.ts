import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

interface Envelope {
  data?: unknown[];
  meta?: { total?: number; quota?: unknown };
}

/** `GET /company/{id}/webhook_endpoints` — up to 100 endpoints, no pagination, plus quota use. */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhook Endpoints",
  description:
    "List the company's webhook endpoints with delivery stats and how much of the 10-endpoint quota is used.",
  params: [companyIdParam],
  output: [
    { key: "endpoints", type: "array", label: "Webhook endpoints" },
    { key: "total", type: "number", label: "Total endpoints" },
    { key: "quota", type: "object", label: "Quota (current, limit, available, exceeded)" },
  ],

  async execute(input, ctx) {
    const body = await new BreezyClient(ctx).request<Envelope>(
      "GET",
      `${company(input.companyId)}/webhook_endpoints`,
    );
    return { endpoints: body.data ?? [], total: body.meta?.total, quota: body.meta?.quota };
  },
};

export default webhookList;
