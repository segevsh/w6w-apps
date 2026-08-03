import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

/**
 * GET /user/usage — this month's consumption (submissions, SSL submissions,
 * payment submissions, upload bytes, mobile submissions, form views) plus
 * `api`, the number of API calls made today.
 *
 * `limitLeft` is lifted off the envelope's `limit-left`, which is the daily API
 * call allowance still available. Together with `api` it gives both halves of
 * the daily budget in one call — which is exactly why the `quota` health check
 * probes this endpoint.
 */
const userGetUsage: ActionDefinition<Record<string, never>> = {
  key: "user-get-usage",
  type: "read",
  resource: "user",
  title: "Get Account Usage",
  description:
    "Retrieve this month's submission, upload and view counts, plus today's API call usage.",
  params: [],
  output: [
    { key: "submissions", type: "string", label: "Submissions this month" },
    { key: "ssl_submissions", type: "string", label: "Secure submissions this month" },
    { key: "payments", type: "string", label: "Payment submissions this month" },
    { key: "uploads", type: "string", label: "Upload space used (bytes)" },
    { key: "mobile_submissions", type: "string", label: "Mobile submissions this month" },
    { key: "views", type: "string", label: "Form views this month" },
    { key: "api", type: "string", label: "API calls used today" },
    { key: "limitLeft", type: "number", label: "Daily API calls remaining" },
  ],

  async execute(_input, ctx) {
    const { content, limitLeft } = await new JotformClient(ctx).request<Record<string, unknown>>(
      "/user/usage",
    );
    return { ...(content ?? {}), limitLeft };
  },
};

export default userGetUsage;
