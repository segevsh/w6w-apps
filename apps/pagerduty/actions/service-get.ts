import type { ActionDefinition } from "@w6w/types";
import { PagerDutyClient } from "../lib/client.ts";

/** `GET /services/{id}` */
const action: ActionDefinition = {
  key: "service-get",
  type: "read",
  resource: "service",
  title: "Get a service",
  description: "Get a single service by ID.",
  params: [
    { key: "serviceId", label: "Service ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const { serviceId } = input as { serviceId: string };
    if (!serviceId) throw new Error("`serviceId` is required");
    const client = new PagerDutyClient(ctx);
    const res = await client.request<{ service: unknown }>(
      `/services/${encodeURIComponent(serviceId)}`,
    );
    return res.service;
  },
};

export default action;
