import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /users/{userId}/timecards/{date}` — Edit a user's timecard for a day.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakTime?: number;
}

const timecardUpdate: ActionDefinition<Input> = {
  key: "timecard-update",
  type: "perform",
  resource: "timecard",
  title: "Update Timecard",
  description: "Edit a user's timecard for a day.",
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
    { key: "clockIn", label: "Clock in", type: "string", hint: "`HH:MM` in the user's timezone." },
    {
      key: "clockOut",
      label: "Clock out",
      type: "string",
      hint: "`HH:MM` in the user's timezone.",
    },
    { key: "breakTime", label: "Break time", type: "number", hint: "Breaks duration in seconds." },
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
      {
        method: "PUT",
        body: compact({
          clockIn: input.clockIn,
          clockOut: input.clockOut,
          breakTime: input.breakTime,
        }),
      },
    );
  },
};

export default timecardUpdate;
