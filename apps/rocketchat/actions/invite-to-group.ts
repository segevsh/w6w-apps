import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  requireRoom,
  RocketChatClient,
  ROOM_ID_PARAM,
  ROOM_NAME_PARAM,
} from "../lib/client.ts";

interface Input {
  roomId?: string;
  roomName?: string;
  usernames: string;
}

// Unlike channels.invite, groups.invite also takes `username` / `usernames`, so this works from
// usernames without a prior user lookup.
const inviteToGroup: ActionDefinition<Input> = {
  key: "invite-to-group",
  type: "perform",
  resource: "group",
  title: "Invite to Private Group",
  description: "Add one or more users to a private group by username (`POST /groups.invite`).",
  idempotent: true,
  params: [
    { ...ROOM_ID_PARAM },
    { ...ROOM_NAME_PARAM },
    {
      key: "usernames",
      label: "Usernames",
      type: "string",
      required: true,
      hint: "One username, or several separated by commas.",
    },
  ],
  output: [{ key: "group", type: "object", label: "The private group" }],

  execute(input, ctx) {
    requireRoom(input);
    const names = input.usernames.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
    if (!names.length) throw new Error("Provide at least one username");
    return new RocketChatClient(ctx).request("/groups.invite", {
      method: "POST",
      body: compact({
        roomId: input.roomId,
        roomName: input.roomName,
        ...(names.length === 1 ? { username: names[0] } : { usernames: names }),
      }),
    });
  },
};

export default inviteToGroup;
