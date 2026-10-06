import type { ActionDefinition } from "@w6w/types";
import { encodeId, oneResource, V2 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /api/v2/status-pages/{status_page_id}` (Better Stack Uptime API v2).
 */
type Input = {
  status_page_id: string;
};

const statusPageGet: ActionDefinition<Input> = {
  key: "status-page-get",
  type: "read",
  resource: "status-page",
  title: "Get Status Page",
  description: "Fetch one status page's settings and current aggregate state.",
  params: [
    str("status_page_id", "Status page ID", {
      required: true,
      hint: "The status page's numeric ID.",
    }),
  ],
  output: [
    { key: "id", type: "string", label: "Status page ID" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "subdomain", type: "string", label: "Subdomain" },
    {
      key: "aggregate_state",
      type: "string",
      label: "operational, degraded, downtime, maintenance...",
    },
    { key: "published", type: "boolean", label: "Published" },
  ],

  execute(input, ctx) {
    return oneResource(ctx, "GET", `${V2}/status-pages/${encodeId(input.status_page_id)}`);
  },
};

export default statusPageGet;
