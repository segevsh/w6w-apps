import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /users/{userId}/timecards/clock-in` — Clock a user in.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  userId: number;
  userDate?: string;
}

const timecardClockIn: ActionDefinition<Input> = {
  key: "timecard-clock-in",
  type: "perform",
  resource: "timecard",
  title: "Clock In",
  description: "Clock a user in.",
  idempotent: false,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour user id (from List Users).",
    },
    {
      key: "userDate",
      label: "User date",
      type: "date",
      hint: "The user's current date; defaults to the date in the profile timezone.",
    },
  ],
  output: [
    { key: "user", type: "number", label: "User ID" },
    { key: "clockIn", type: "string", label: "Clock in" },
    { key: "clockOut", type: "string", label: "Clock out" },
    { key: "workTime", type: "number", label: "Seconds worked" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/users/${encodeId(input.userId)}/timecards/clock-in`, {
      method: "POST",
      body: compact({ userDate: input.userDate }),
    });
  },
};

export default timecardClockIn;
