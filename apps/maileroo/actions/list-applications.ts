import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, pageInfo } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
}

/**
 * `GET /v1/applications` (scope `applications.read`). The vendor returns each application's
 * `smtp_password` and `sending_key` here; both are DROPPED from the output so a credential never
 * lands in a run record. Read them from the Maileroo dashboard.
 */
const listApplications: ActionDefinition<Input> = {
  key: "list-applications",
  type: "search",
  resource: "application",
  title: "List Applications",
  description: "List the account's applications (SMTP/API credential sets scoped to domains and " +
    "IPs) with their counts. SMTP password and sending key are deliberately not returned. " +
    "Account API Key (applications.read).",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      validation: { min: 10, max: 100, integer: true },
    },
  ],
  output: [
    {
      key: "applications",
      type: "array",
      label:
        "id, name, smtp_username, authorized_domain_count, ip_block_count, outbound_ip_count, notes",
    },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Page size" },
    { key: "total", type: "number", label: "Total applications" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/applications", {
      query: { page: input.page, per_page: input.perPage },
    });
    const d = (data ?? {}) as Record<string, unknown>;
    const applications = ((d.applications as Record<string, unknown>[] | undefined) ?? []).map(
      (a) => {
        const { smtp_password: _p, sending_key: _k, ...safe } = a;
        return safe;
      },
    );
    return { applications, ...pageInfo(d) };
  },
};

export default listApplications;
