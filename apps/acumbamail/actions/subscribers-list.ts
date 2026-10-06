import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  status?: number | string;
  block_index?: number | string;
  all_fields?: boolean;
  complete_json?: boolean;
}

/** `POST /api/1/getSubscribers/` */
const subscribersList: ActionDefinition<Input> = {
  key: "subscribers-list",
  type: "search",
  title: "List Subscribers",
  description:
    "Subscribers of a list, indexed by email, in blocks of up to 10,000 (limit: 10 requests per minute).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "status",
      label: "Status",
      type: "number",
      hint:
        "0 active, 1 non-verified, 2 unsubscribed, 3 hard bounced, 4 complained. Omit for the vendor default.",
    },
    {
      key: "block_index",
      label: "Block index",
      type: "number",
      hint: "0 returns subscribers 1-10,000, 1 returns 10,001-20,000, and so on (default 0).",
    },
    {
      key: "all_fields",
      label: "All fields",
      type: "boolean",
      hint: "Return every field of each subscriber.",
    },
    {
      key: "complete_json",
      label: "Complete JSON",
      type: "boolean",
      hint: "Return the complete JSON form.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getSubscribers", {
      list_id: required("list_id", input.list_id),
      status: input.status,
      block_index: input.block_index,
      all_fields: input.all_fields,
      complete_json: input.complete_json,
    });
    return { result };
  },
};

export default subscribersList;
