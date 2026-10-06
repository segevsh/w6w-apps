import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  userIds: string;
}

// The spec's body is a oneOf: `{roomId, userId}` or `{roomId, userIds[]}`. One id is sent in the
// first form, several in the second.
const inviteToChannel: ActionDefinition<Input> = {
  key: "invite-to-channel",
  type: "perform",
  resource: "channel",
  title: "Invite to Channel",
  description: "Add one or more users to a public channel by user ID (`POST /channels.invite`).",
  idempotent: true,
  params: [
    { key: "roomId", label: "Channel ID", type: "string", required: true },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "One user `_id`, or several separated by commas. These are IDs, not usernames.",
    },
  ],
  output: [{ key: "channel", type: "object", label: "The channel" }],

  execute(input, ctx) {
    const ids = input.userIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) throw new Error("Provide at least one user ID");
    const body = ids.length === 1
      ? { roomId: input.roomId, userId: ids[0] }
      : { roomId: input.roomId, userIds: ids };
    return new RocketChatClient(ctx).request("/channels.invite", { method: "POST", body });
  },
};

export default inviteToChannel;
