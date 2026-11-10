import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import getChannelFollowers from "../actions/get-channel-followers.ts";

export default pollFromListAction({
  key: "new-follower",
  title: "New Follower",
  description: "The run gets each new follower of the channel you choose, polled through " +
    "get-channel-followers (Twitch lists the most recent follower first). The token needs " +
    "moderator:read:followers and must belong to the broadcaster or a moderator.",
  action: getChannelFollowers as unknown as ActionDefinition,
  input: (params: { broadcasterId?: string }) => ({
    broadcasterId: params.broadcasterId,
    first: 100,
  }),
  params: [getChannelFollowers.params![0]],
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { user_id?: unknown }).user_id ?? ""),
  output: [
    { key: "user_id", type: "string", label: "Follower user ID" },
    { key: "user_login", type: "string", label: "Follower login" },
    { key: "user_name", type: "string", label: "Follower display name" },
    { key: "followed_at", type: "string", label: "Followed at (RFC3339)" },
  ],
  sample: {
    user_id: "11111",
    user_login: "viewer1",
    user_name: "Viewer1",
    followed_at: "2026-01-01T00:00:00Z",
  },
  maxPages: 1,
});
