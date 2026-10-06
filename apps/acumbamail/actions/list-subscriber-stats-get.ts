import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  block_index?: number | string;
}

/** `POST /api/1/getListSubsStats/` */
const listSubscriberStatsGet: ActionDefinition<Input> = {
  key: "list-subscriber-stats-get",
  type: "read",
  title: "Get List Subscriber Stats",
  description:
    "What each subscriber of a list did with each campaign they received, 100 subscribers per block (limit: 10 requests per minute).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "block_index",
      label: "Block index",
      type: "number",
      hint: "0 returns subscribers 1-100, 1 returns 101-200 (default 0).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getListSubsStats", {
      list_id: required("list_id", input.list_id),
      block_index: input.block_index,
    });
    return { result };
  },
};

export default listSubscriberStatsGet;
