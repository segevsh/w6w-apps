import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /users/{userId}/timesheets` — List a user's weekly timesheets.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  limit?: number;
}

const userTimesheetList: ActionDefinition<Input> = {
  key: "user-timesheet-list",
  type: "search",
  resource: "timesheet",
  title: "List User Timesheets",
  description: "List a user's weekly timesheets.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour user id (from List Users).",
    },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Max number of weeks." },
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
    return new EverhourClient(ctx).many(`/users/${encodeId(input.userId)}/timesheets`, {
      query: { "limit": input.limit },
    });
  },
};

export default userTimesheetList;
