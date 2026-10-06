import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /users/{userId}/time` — List one user's time records.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

const userTimeList: ActionDefinition<Input> = {
  key: "user-time-list",
  type: "search",
  resource: "time-record",
  title: "List User Time Records",
  description: "List one user's time records.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour user id (from List Users).",
    },
    { key: "from", label: "From", type: "date", hint: "Start date, YYYY-MM-DD." },
    { key: "to", label: "To", type: "date", hint: "End date, YYYY-MM-DD." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max records per page; the vendor maximum is 50000.",
    },
    { key: "page", label: "Page", type: "number", hint: "Results page, starting at 1." },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/users/${encodeId(input.userId)}/time`, {
      query: { "from": input.from, "to": input.to, "page": input.page, "limit": input.limit },
    });
  },
};

export default userTimeList;
