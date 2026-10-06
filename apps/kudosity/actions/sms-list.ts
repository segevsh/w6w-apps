import type { ActionDefinition } from "@w6w/types";
import { KudosityClient } from "../lib/client.ts";

/**
 * `GET /v2/sms` — list SMS messages. The response is `{smses, total_records, total_segments}`;
 * paging is `page` plus `limit`. `format=CSV` exists on the wire but is not offered here: a
 * workflow wants the JSON.
 */
interface Input {
  limit?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
  recipient?: string;
  sender?: string;
  messageRef?: string;
  status?: string;
  direction?: string;
  newestFirst?: boolean;
}

const STATUSES = [
  "PENDING",
  "SENT",
  "FAILED",
  "DELIVERED",
  "ACCEPTED",
  "SOFT_BOUNCE",
  "HARD_BOUNCE",
  "OTHER",
  "REJECTED",
  "PENDING_APPROVAL",
  "SUBMITTED",
  "UNDELIVERABLE",
  "READ",
];

const smsList: ActionDefinition<Input> = {
  key: "sms-list",
  type: "search",
  resource: "sms",
  title: "List SMS",
  description: "List SMS messages, filtered by date, number, sender, reference, status or " +
    "direction.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      hint: "Messages per page.",
      validation: { min: 1, integer: true },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      hint: "Page number.",
      validation: { min: 1, integer: true },
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "RFC 3339, e.g. 2024-01-01T00:00:00Z.",
    },
    { key: "endDate", label: "End date", type: "string", hint: "RFC 3339." },
    { key: "recipient", label: "Recipient", type: "string" },
    { key: "sender", label: "Sender", type: "string" },
    { key: "messageRef", label: "Message reference", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUSES.map((s) => ({ value: s, label: s })),
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ value: "OUT", label: "Outbound" }, { value: "IN", label: "Inbound" }],
    },
    { key: "newestFirst", label: "Newest first", type: "boolean", default: true },
  ],
  output: [
    { key: "smses", type: "array", label: "Messages" },
    { key: "total_records", type: "string", label: "Total records" },
    { key: "total_segments", type: "string", label: "Total segments" },
  ],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json("/sms", {
      query: {
        limit: input.limit,
        page: input.page,
        start_date: input.startDate,
        end_date: input.endDate,
        recipient: input.recipient,
        sender: input.sender,
        message_ref: input.messageRef,
        status: input.status,
        direction: input.direction,
        order_by: input.newestFirst === undefined
          ? undefined
          : [input.newestFirst ? "CREATED_AT_DESC" : "CREATED_AT_ASC"],
        format: "JSON",
      },
    });
  },
};

export default smsList;
