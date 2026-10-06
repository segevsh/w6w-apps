import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
}

/** `POST /api/1/getListStats/` */
const listStatsGet: ActionDefinition<Input> = {
  key: "list-stats-get",
  type: "read",
  title: "Get List Stats",
  description:
    "Name, creation date, subscriber/unsubscribe/bounce/complaint counts and average opens, unique clicks and bounces over the last 20 sent campaigns (limit: 10 requests per minute).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getListStats", {
      list_id: required("list_id", input.list_id),
    });
    return { result };
  },
};

export default listStatsGet;
