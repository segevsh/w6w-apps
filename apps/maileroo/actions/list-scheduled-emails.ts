import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

interface Input {
  domain?: string;
  page?: number;
  perPage?: number;
}

/** `GET /api/v2/emails/scheduled` — emails queued with `scheduled_at`. */
const listScheduledEmails: ActionDefinition<Input> = {
  key: "list-scheduled-emails",
  type: "search",
  resource: "email",
  title: "List Scheduled Emails",
  description: "List emails scheduled for future delivery, paginated. Needs the Sending Key. " +
    "A domain-scoped key needs no domain; an application-scoped key must name one.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: "Required for an application-scoped sending key; it must be one of its domains.",
    },
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
      default: 10,
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    {
      key: "results",
      type: "array",
      label: "Scheduled emails (from, recipients, subject, scheduled_at, …)",
    },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total scheduled emails" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).send("/emails/scheduled", {
      query: { domain: input.domain?.trim(), page: input.page, per_page: input.perPage },
    });
    const d = (data ?? {}) as Record<string, unknown>;
    const page = Number(d.page ?? 1);
    const totalPages = Number(d.total_pages ?? 1);
    return {
      results: d.results ?? [],
      page,
      perPage: d.per_page,
      totalCount: d.total_count,
      totalPages,
      hasMore: page < totalPages,
    };
  },
};

export default listScheduledEmails;
