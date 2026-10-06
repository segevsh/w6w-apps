import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  domainId: number;
}

/** `GET /v1/domains/:domain_id/analytics` (scope `domains.analytics.read`). */
const getDomainAnalytics: ActionDefinition<Input> = {
  key: "get-domain-analytics",
  type: "read",
  resource: "domain",
  title: "Get Domain Analytics",
  description: "Aggregate totals, a daily timeline and the top receiving providers for one " +
    "domain. Account API Key (domains.analytics.read).",
  params: [{
    key: "domainId",
    label: "Domain ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
  }],
  output: [
    { key: "aggregate", type: "object", label: "delivered, bounced, opens, clicks, suppressions" },
    { key: "timeline", type: "array", label: "Daily entries: date + totals" },
    { key: "serviceProviders", type: "array", label: "Top providers: name + count" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/domains/${seg(input.domainId, "domainId")}/analytics`,
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      aggregate: d.aggregate,
      timeline: d.timeline ?? [],
      serviceProviders: d.service_providers ?? [],
    };
  },
};

export default getDomainAnalytics;
