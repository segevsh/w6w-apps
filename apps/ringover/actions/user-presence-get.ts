import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";

interface Input {
  userId: number;
}

const userPresenceGet: ActionDefinition<Input> = {
  key: "user-presence-get",
  type: "read",
  resource: "user",
  title: "Get User Presence",
  description:
    "Whether a user is available, on a call, snoozed or offline, with snooze details and connected devices.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "in_call", type: "number", label: "Current calls" },
    { key: "connected_devices", type: "number", label: "Connected devices" },
    { key: "is_snoozed", type: "boolean", label: "Snoozed" },
    { key: "snooze_type", type: "string", label: "Snooze type" },
    { key: "snooze_end", type: "string", label: "Snooze end" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/users/${seg(input.userId)}/presences`);
  },
};

export default userPresenceGet;
