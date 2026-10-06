import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  list_id: number | string;
  date_from: string;
  date_to: string;
}

/** `POST /api/1/getStatsByDate/` */
const statsByDateGet: ActionDefinition<Input> = {
  key: "stats-by-date-get",
  type: "read",
  title: "Get List Stats by Date",
  description:
    "Grouped statistics of the campaigns sent to a list within a date range (limit: 10 requests per minute).",
  params: [
    {
      key: "list_id",
      label: "List ID",
      type: "number",
      required: true,
      hint: "Numeric list identifier (from List Lists).",
    },
    {
      key: "date_from",
      label: "From date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
    },
    {
      key: "date_to",
      label: "To date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getStatsByDate", {
      list_id: required("list_id", input.list_id),
      date_from: required("date_from", input.date_from),
      date_to: required("date_to", input.date_to),
    });
    return { result };
  },
};

export default statsByDateGet;
