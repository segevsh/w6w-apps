import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /users/{userId}/timecards` — List a user's timecards (the last two weeks by default).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  from?: string;
  to?: string;
}

const userTimecardList: ActionDefinition<Input> = {
  key: "user-timecard-list",
  type: "search",
  resource: "timecard",
  title: "List User Timecards",
  description: "List a user's timecards (the last two weeks by default).",
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
    return new EverhourClient(ctx).many(`/users/${encodeId(input.userId)}/timecards`, {
      query: { "from": input.from, "to": input.to },
    });
  },
};

export default userTimecardList;
