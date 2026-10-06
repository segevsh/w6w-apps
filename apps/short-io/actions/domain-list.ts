import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  pattern?: string;
}

interface Domain {
  id: number;
  hostname: string;
  state?: string;
  [k: string]: unknown;
}

/**
 * GET /api/domains — the response is a bare JSON array (not an envelope), and
 * the route is `/api/domains` while a single domain is `/domains/{id}`.
 */
const domainList: ActionDefinition<Input, { domains: Domain[] }> = {
  key: "domain-list",
  type: "search",
  resource: "domain",
  title: "List Domains",
  description: "List the domains on the account. Use a domain's `id` with List Links.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 300 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
    },
    { key: "pattern", label: "Hostname contains", type: "string" },
  ],
  output: [{ key: "domains", type: "array", label: "Domains" }],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<Domain[]>("/api/domains", {
      query: { limit: input.limit ?? 100, offset: input.offset, pattern: input.pattern },
    });
    return { domains: Array.isArray(res) ? res : [] };
  },
};

export default domainList;
