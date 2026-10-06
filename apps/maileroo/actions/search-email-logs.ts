import type { ActionDefinition } from "@w6w/types";
import { compact, MailerooClient, seg } from "../lib/client.ts";
import { asArray } from "../lib/mail.ts";

interface Input {
  domainId?: number;
  messageId?: string;
  referenceId?: string;
  subject?: string;
  sender?: string;
  recipient?: string;
  logType?: string;
  tags?: unknown;
  tagsOperator?: string;
  from?: number;
  to?: number;
  oldestFirst?: boolean;
  page?: number;
}

const LOG_TYPES = ["Delivered", "Deferred", "Suppressed", "Bounced", "Complained"];

/**
 * `POST /v1/logs/search` (scope `user_logs.read`), or `POST /v1/domains/:id/logs/search`
 * (`domains.logs.read`) when a domain is named — the vendor documents the domain form as
 * identical to the account form. Empty strings and 0 are ignored by the vendor; unset filters
 * are simply not sent here.
 */
const searchEmailLogs: ActionDefinition<Input> = {
  key: "search-email-logs",
  type: "search",
  resource: "email-log",
  title: "Search Email Logs",
  description:
    "Search delivery logs (14 days retained) by message, reference ID, subject, sender, " +
    "recipient, tags, outcome and time range, across the account or one domain. Account API Key " +
    "(user_logs.read, or domains.logs.read for a domain).",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Limit to one domain (List Domains gives the ID). Empty searches the whole account.",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      hint: "Angle brackets are added for you.",
    },
    { key: "referenceId", label: "Reference ID", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    { key: "sender", label: "Sender address", type: "string" },
    { key: "recipient", label: "Recipient address", type: "string" },
    {
      key: "logType",
      label: "Outcome",
      type: "select",
      options: LOG_TYPES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "tags",
      label: "Tag filters",
      type: "json",
      hint: 'Array of { "name", "value" }, e.g. [{"name":"campaign","value":"welcome"}].',
    },
    {
      key: "tagsOperator",
      label: "Tag match",
      type: "select",
      options: [{ value: "AND", label: "AND (default)" }, { value: "OR", label: "OR" }],
    },
    {
      key: "from",
      label: "From (Unix time)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "to", label: "To (Unix time)", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "oldestFirst",
      label: "Oldest first",
      type: "boolean",
      hint: "Default is newest first.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Log entries, each with its events (delivered, bounced, …)",
    },
    { key: "page", type: "number", label: "Current page" },
    { key: "hasMore", type: "boolean", label: "Another page follows" },
  ],

  async execute(input, ctx) {
    const filters = compact({
      message_id: input.messageId?.trim(),
      reference_id: input.referenceId?.trim(),
      subject: input.subject,
      sender: input.sender?.trim(),
      recipient: input.recipient?.trim(),
      log_type: input.logType,
      tags: asArray(input.tags, "tags"),
      tags_operator: input.tagsOperator,
      datetime_from: input.from,
      datetime_to: input.to,
      sort_dir: input.oldestFirst ? 1 : undefined,
    });
    const path = input.domainId
      ? `/domains/${seg(input.domainId, "domainId")}/logs/search`
      : "/logs/search";
    const { data } = await new MailerooClient(ctx).account(path, {
      method: "POST",
      body: { filters, page: input.page ?? 1 },
    });
    const d = (data ?? {}) as { items?: unknown[]; page?: number; has_more?: boolean };
    return { items: d.items ?? [], page: d.page ?? input.page ?? 1, hasMore: d.has_more ?? false };
  },
};

export default searchEmailLogs;
