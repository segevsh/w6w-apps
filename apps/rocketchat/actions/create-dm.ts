import type { ActionDefinition } from "@w6w/types";
import { compact, RocketChatClient } from "../lib/client.ts";

interface Input {
  usernames: string;
  excludeSelf?: boolean;
}

// `POST /api/v1/dm.create`. The older `im.create` is the same route under its former name; the
// spec documents `dm.*` (its only `im.*` entry is `im.blockUser`), so `dm.*` is used throughout.
const createDm: ActionDefinition<Input> = {
  key: "create-dm",
  type: "perform",
  resource: "direct-message",
  title: "Create Direct Message",
  description:
    "Open (or fetch the existing) direct-message room with one user, or a multi-user DM with " +
    "several (`POST /dm.create`). The returned `room._id` is what Post Message and Send Message " +
    "need.",
  idempotent: true,
  params: [
    {
      key: "usernames",
      label: "Usernames",
      type: "string",
      required: true,
      hint: "One username, or several separated by commas for a group DM.",
    },
    {
      key: "excludeSelf",
      label: "Exclude self",
      type: "boolean",
      hint: "Create the DM without the connected user in it.",
    },
  ],
  output: [
    { key: "room", type: "object", label: "The DM room" },
    { key: "room.rid", type: "string", label: "Room ID" },
  ],

  execute(input, ctx) {
    const names = input.usernames.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
    if (!names.length) throw new Error("Provide at least one username");
    return new RocketChatClient(ctx).request("/dm.create", {
      method: "POST",
      body: compact({
        ...(names.length === 1 ? { username: names[0] } : { usernames: names.join(",") }),
        excludeSelf: input.excludeSelf,
      }),
    });
  },
};

export default createDm;
