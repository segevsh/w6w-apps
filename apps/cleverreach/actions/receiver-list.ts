import type { ActionDefinition } from "@w6w/types";
import {
  asList,
  CleverReachClient,
  list,
  optEnum,
  optInt,
  optString,
  pathId,
} from "../lib/client.ts";

const TYPES = ["all", "active", "inactive", "bounce"] as const;

const action: ActionDefinition = {
  key: "receiver-list",
  type: "search",
  resource: "receiver",
  title: "List receivers in a group",
  description:
    "List a group's receivers (`GET /v3/groups/{group_id}/receivers`). Pages are zero-based; the page size is capped at 5000.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1-5000. Vendor default 50.",
      validation: { integer: true, min: 1, max: 5000 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Zero-based.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, {
        value: "inactive",
        label: "Inactive",
      }, { value: "bounce", label: "Bounced" }],
    },
    {
      key: "detail",
      label: "Detail depth",
      type: "number",
      hint: "Bitwise: 1 events, 2 orders, 4 tags (e.g. 5 = events + tags).",
      validation: { integer: true, min: 0, max: 7 },
    },
    { key: "emailList", label: "Only these emails", type: "string", hint: "Comma-separated." },
    { key: "idList", label: "Only these receiver ids", type: "string", hint: "Comma-separated." },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "A field name, then `asc` or `desc`, e.g. `email asc`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Number of records on this page" },
    {
      key: "nextPage",
      type: "number",
      label: "The next zero-based page, or null when this page was not full",
    },
    {
      key: "raw",
      type: "object",
      label: "The body, when CleverReach did not answer with an array",
    },
  ],

  async execute(input, ctx) {
    const pageSize = optInt(input.pageSize, "pageSize", 1, 5000);
    const page = optInt(input.page, "page", 0, Number.MAX_SAFE_INTEGER);
    const out = asList(
      await new CleverReachClient(ctx).request(
        `/groups/${pathId(input.groupId, "groupId")}/receivers`,
        {
          query: {
            pagesize: pageSize,
            page,
            type: optEnum(input.type, "type", TYPES),
            detail: optInt(input.detail, "detail", 0, 7),
            email_list: list(input.emailList)?.join(","),
            id_list: list(input.idList)?.join(","),
            order_by: optString(input.orderBy),
          },
        },
      ),
    );
    // The vendor's default page size is 50; a short page is the last one.
    const size = pageSize ?? 50;
    return { ...out, nextPage: out.count >= size ? (page ?? 0) + 1 : null };
  },
};

export default action;
