import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /domains/{domain_id}` — verified against Resend's OpenAPI document.
 */
const action: ActionDefinition = {
  key: "domain-get",
  type: "read",
  resource: "domain",
  title: "Get a domain",
  description: "Retrieve one domain, its status and its DNS records.",
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Domain ID" },
    { key: "name", type: "string", label: "Domain" },
    { key: "status", type: "string", label: "Status" },
    { key: "region", type: "string", label: "Region" },
    { key: "records", type: "array", label: "DNS records" },
    { key: "open_tracking", type: "boolean", label: "Open tracking" },
    { key: "click_tracking", type: "boolean", label: "Click tracking" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domainId = String(p.domainId ?? "").trim();
    if (!domainId) throw new Error("`domainId` is required");

    ctx.log("info", "getting Resend domain", { domainId });
    return await new ResendClient(ctx).request(`/domains/${encodeURIComponent(domainId)}`);
  },
};

export default action;
