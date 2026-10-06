import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  applicationId: number;
}

/**
 * `GET /v1/applications/:application_id` (scope `applications.read`). `smtp_password` and
 * `sending_key` are in the vendor's response and intentionally not mapped.
 */
const getApplication: ActionDefinition<Input> = {
  key: "get-application",
  type: "read",
  resource: "application",
  title: "Get Application",
  description: "Read one application: SMTP username, authorized domains, IP allowlist, allowed " +
    "From local parts and recipient domains, outbound IPs and notes. The SMTP password and " +
    "sending key are deliberately not returned. Account API Key (applications.read).",
  params: [{
    key: "applicationId",
    label: "Application ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
  }],
  output: [
    { key: "id", type: "number", label: "Application ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "smtpUsername", type: "string", label: "SMTP username" },
    { key: "authorizedDomains", type: "array", label: "domain_id + domain_name" },
    { key: "ipAllowlist", type: "array", label: "ip_block entries" },
    { key: "localPartList", type: "array", label: "Allowed From local parts (empty = any)" },
    {
      key: "allowedRecipientDomains",
      type: "array",
      label: "Allowed recipient domains (empty = any)",
    },
    { key: "outboundIps", type: "array", label: "Outbound IP allotments" },
    { key: "notes", type: "string", label: "Notes" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/applications/${seg(input.applicationId, "applicationId")}`,
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      id: d.id,
      name: d.name,
      smtpUsername: d.smtp_username,
      authorizedDomains: d.authorized_domains ?? [],
      ipAllowlist: d.ip_allowlist ?? [],
      localPartList: d.local_part_list ?? [],
      allowedRecipientDomains: d.allowed_recipient_domains ?? [],
      outboundIps: d.outbound_ips ?? [],
      notes: d.notes,
    };
  },
};

export default getApplication;
