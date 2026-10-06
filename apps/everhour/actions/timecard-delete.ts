import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /users/{userId}/timecards/{date}` — Delete a user's timecard for a day.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  date: string;
}

const timecardDelete: ActionDefinition<Input> = {
  key: "timecard-delete",
  type: "perform",
  resource: "timecard",
  title: "Delete Timecard",
  description: "Delete a user's timecard for a day.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour user id (from List Users).",
    },
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "The timecard date, YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/users/${encodeId(input.userId)}/timecards/${encodeId(input.date)}`,
      { method: "DELETE" },
    );
  },
};

export default timecardDelete;
