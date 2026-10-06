import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, strList } from "../lib/client.ts";

interface Input {
  page?: number;
  items?: number;
  order?:
    | "created_at desc"
    | "created_at asc"
    | "performed_at desc"
    | "performed_at asc"
    | "updated_at desc"
    | "updated_at asc";
  date_filter?: "created_at" | "performed_at" | "updated_at";
  from?: string;
  to?: string;
  source?: string;
  source_id?: string[] | string;
  owner_uuid?: string[] | string;
  participating_user_uuid?: string[] | string;
  conversation_type_uuid?: string;
  customer_phone_number?: string[] | string;
  customer_email_address?: string[] | string;
  with_simple_transcript?: boolean;
}

/** `GET /calls` */
const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description:
    "List calls and meetings within the API key's access scope, with summaries, tasks, speakers and customers. Filter by date, owner, integration source or customer.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "items",
      label: "Items per page",
      type: "number",
      hint: "1-100, defaults to 10.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      hint: "Defaults to `created_at desc`.",
      options: [
        { value: "created_at desc", label: "created_at desc" },
        { value: "created_at asc", label: "created_at asc" },
        { value: "performed_at desc", label: "performed_at desc" },
        { value: "performed_at asc", label: "performed_at asc" },
        { value: "updated_at desc", label: "updated_at desc" },
        { value: "updated_at asc", label: "updated_at asc" },
      ],
    },
    {
      key: "date_filter",
      label: "Date filter",
      type: "select",
      hint: "Which date `from`/`to` apply to. Defaults to created_at.",
      options: [{ value: "created_at", label: "created_at" }, {
        value: "performed_at",
        label: "performed_at",
      }, { value: "updated_at", label: "updated_at" }],
    },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SS.000Z",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Integration slug, e.g. `aircall`.",
    },
    {
      key: "source_id",
      label: "Source call IDs",
      type: "array",
      item: { type: "string" },
      hint: "The call's id within its integration.",
    },
    {
      key: "owner_uuid",
      label: "Owner UUIDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "participating_user_uuid",
      label: "Participating user UUIDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "conversation_type_uuid",
      label: "Conversation type UUID",
      type: "string",
    },
    {
      key: "customer_phone_number",
      label: "Customer phone numbers",
      type: "array",
      item: { type: "string" },
      hint: "E.164, e.g. +32474000000.",
    },
    {
      key: "customer_email_address",
      label: "Customer email addresses",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "with_simple_transcript",
      label: "Include simple transcript",
      type: "boolean",
      hint: "Return the transcript as one string per call. Off by default.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records on this page" },
    {
      key: "pagination",
      type: "object",
      label: "{ page, items, count, pages } — stop when page reaches pages",
    },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", "/calls", {
      query: {
        page: input.page,
        items: input.items,
        order: input.order,
        date_filter: input.date_filter,
        from: input.from,
        to: input.to,
        source: input.source,
        source_id: strList(input.source_id),
        owner_uuid: strList(input.owner_uuid),
        participating_user_uuid: strList(input.participating_user_uuid),
        conversation_type_uuid: input.conversation_type_uuid,
        customer_phone_number: strList(input.customer_phone_number),
        customer_email_address: strList(input.customer_email_address),
        with_simple_transcript: input.with_simple_transcript,
      },
    });
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default callList;
