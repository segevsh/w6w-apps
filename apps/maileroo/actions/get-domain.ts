import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  domainId: number;
}

/** `GET /v1/domains/:domain_id` (scope `domains.read`). */
const getDomain: ActionDefinition<Input> = {
  key: "get-domain",
  type: "read",
  resource: "domain",
  title: "Get Domain",
  description:
    "Read one domain with its DNS records (DKIM, SPF, DMARC, MX, tracking) and whether " +
    "each is in place, its tracking settings and sending statistics. Account API Key (domains.read).",
  params: [{
    key: "domainId",
    label: "Domain ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint: "From List Domains.",
  }],
  output: [
    { key: "id", type: "number", label: "Domain ID" },
    { key: "domainName", type: "string", label: "Domain name" },
    { key: "status", type: "boolean", label: "DNS verified" },
    {
      key: "dnsRecords",
      type: "object",
      label: "dkim_record, spf_record, dmarc_record, mx_record, tracking_record",
    },
    { key: "sandbox", type: "boolean", label: "Sandbox domain" },
    { key: "free", type: "boolean", label: "Free sub-domain" },
    { key: "interactionTracking", type: "boolean", label: "Open/click tracking on" },
    { key: "customHostnameTracking", type: "boolean", label: "Custom tracking hostname on" },
    { key: "returnPath", type: "string", label: "Return-path local part" },
    { key: "statistics", type: "object", label: "delivered, bounced, opened, clicked" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/domains/${seg(input.domainId, "domainId")}`,
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      domainName: d.domain_name,
      status: d.status,
      dnsRecords: d.dns_records,
      sandbox: d.sandbox,
      free: d.free,
      interactionTracking: d.interaction_tracking,
      customHostnameTracking: d.custom_hostname_tracking,
      returnPath: d.return_path,
      statistics: d.statistics,
    };
  },
};

export default getDomain;
