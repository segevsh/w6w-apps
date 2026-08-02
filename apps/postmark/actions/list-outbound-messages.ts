import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
  recipient?: string;
  fromEmail?: string;
  tag?: string;
  status?: "queued" | "sent" | "processed" | "";
  subject?: string;
  fromdate?: string;
  todate?: string;
  messageStream?: string;
}

/**
 * `GET /messages/outbound` — search sent messages. `count`/`offset` are
 * always sent (Postmark treats them as required); everything else narrows
 * the search.
 * https://postmarkapp.com/developer/api/messages-api#outbound-message-search
 */
const listOutboundMessages: ActionDefinition<Input> = {
  key: "list-outbound-messages",
  type: "read",
  resource: "message",
  title: "List Outbound Messages",
  description: "Search sent (outbound) messages by recipient, tag, status, subject, or date range.",
  params: [
    { key: "count", label: "Count", type: "number", default: 100, hint: "Max 500 per request." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "recipient", label: "Recipient", type: "string" },
    { key: "fromEmail", label: "From Email", type: "string" },
    { key: "tag", label: "Tag", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "queued", label: "Queued" },
        { value: "sent", label: "Sent" },
        { value: "processed", label: "Processed" },
      ],
    },
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "fromdate",
      label: "From Date",
      type: "string",
      hint: "YYYY-MM-DD, Eastern Time, inclusive.",
    },
    {
      key: "todate",
      label: "To Date",
      type: "string",
      hint: "YYYY-MM-DD, Eastern Time, inclusive.",
    },
    { key: "messageStream", label: "Message Stream", type: "string" },
  ],
  output: [
    { key: "TotalCount", type: "number", label: "Total Count" },
    { key: "Messages", type: "array", label: "Messages" },
  ],

  execute(input, ctx) {
    const qs = new URLSearchParams();
    qs.set("count", String(input.count ?? 100));
    qs.set("offset", String(input.offset ?? 0));
    if (input.recipient) qs.set("recipient", input.recipient);
    if (input.fromEmail) qs.set("fromemail", input.fromEmail);
    if (input.tag) qs.set("tag", input.tag);
    if (input.status) qs.set("status", input.status);
    if (input.subject) qs.set("subject", input.subject);
    if (input.fromdate) qs.set("fromdate", input.fromdate);
    if (input.todate) qs.set("todate", input.todate);
    if (input.messageStream) qs.set("messagestream", input.messageStream);
    return postmarkFetch(ctx, `/messages/outbound?${qs.toString()}`);
  },
};

export default listOutboundMessages;
