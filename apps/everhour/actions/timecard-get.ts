import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /users/{userId}/timecards/{date}` — Fetch a user's timecard for one day.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  date: string;
}

const timecardGet: ActionDefinition<Input> = {
  key: "timecard-get",
  type: "read",
  resource: "timecard",
  title: "Get Timecard",
  description: "Fetch a user's timecard for one day.",
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
    { key: "user", type: "number", label: "User ID" },
    { key: "clockIn", type: "string", label: "Clock in" },
    { key: "clockOut", type: "string", label: "Clock out" },
    { key: "workTime", type: "number", label: "Seconds worked" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/users/${encodeId(input.userId)}/timecards/${encodeId(input.date)}`,
    );
  },
};

export default timecardGet;
