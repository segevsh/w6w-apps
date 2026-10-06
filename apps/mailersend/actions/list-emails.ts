import type { ActionDefinition } from "@w6w/types";
import { dateParam, toList, toTimestamp } from "../lib/client.ts";
import { listOf } from "../lib/factories.ts";

interface Input extends Record<string, unknown> {
  domainId: string;
  dateFrom: string | number;
  dateTo: string | number;
  page?: number;
  limit?: number;
  status?: unknown;
  interaction?: unknown;
  recipientEmail?: string;
  messageId?: string;
  templateId?: string;
  subject?: string;
  tag?: string;
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const listEmails: ActionDefinition<Input> = listOf<Input>({
  key: "list-emails",
  resource: "email",
  title: "List Emails",
  description:
    "List the individual emails a domain sent in a window (GET /v1/emails), newest first, with status, interaction and suppression reason. `domainId`, `dateFrom` and `dateTo` are required. Walk pages by following `links.next` until it is null: there is no `total` or `last_page`. Shares a 10 requests/minute budget with List Activities.",
  path: () => "/emails",
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true },
    dateParam("dateFrom", "Date from", true),
    dateParam("dateTo", "Date to", true),
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1 to 100. For older rows, narrow the date window instead.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "10 to 1000 (default 25).",
      validation: { min: 10, max: 1000, integer: true },
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: opts(["queued", "sent", "rejected", "delivered"]),
      hint: "Combined with OR.",
    },
    {
      key: "interaction",
      label: "Interaction",
      type: "multiselect",
      options: opts(["opened", "clicked", "unsubscribed", "complained", "no_interaction"]),
      hint: "Combined with OR.",
    },
    { key: "recipientEmail", label: "Recipient email", type: "string", hint: "Exact match." },
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      hint: "The `x-message-id` of a send.",
    },
    { key: "templateId", label: "Template ID", type: "string" },
    { key: "subject", label: "Subject contains", type: "string", hint: "At least 3 characters." },
    { key: "tag", label: "Tag", type: "string", hint: "Exact match against the email's tags." },
  ],
  query: (i) => ({
    domain_id: i.domainId,
    date_from: toTimestamp(i.dateFrom),
    date_to: toTimestamp(i.dateTo),
    page: i.page,
    limit: i.limit,
    status: toList(i.status),
    interaction: toList(i.interaction),
    recipient_email: i.recipientEmail,
    message_id: i.messageId,
    template_id: i.templateId,
    subject: i.subject,
    tag: i.tag,
  }),
  output: [
    { key: "data", type: "array", label: "Emails (text/html are always null in the list)" },
    {
      key: "links",
      type: "object",
      label: "`next` is null on the last page; `last` is always null",
    },
    { key: "meta", type: "object", label: "current_page, per_page — no total" },
  ],
});

export default listEmails;
