import type { TriggerDefinition } from "@w6w/types";
import listChannelMembers from "../actions/list-channel-members.ts";
import { snapshotAdded, TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

interface Params {
  teamId: string;
  channelId: string;
}

/** Members per request; 10 requests of 500 stay inside the snapshot kit's 5,000-row cap. */
const PAGE_SIZE = 500;

/**
 * `GET /teams/{team-id}/channels/{channel-id}/members?$top=500` — the same request as List Channel
 * Members (https://learn.microsoft.com/en-us/graph/api/channel-list-members, verified 2026-11-10;
 * default and maximum page sizes 100 and 999). A membership has no join time to sort or filter by,
 * so the whole list is compared with the last check.
 */
const newChannelMember: TriggerDefinition<Params> = {
  key: "new-channel-member",
  title: "New Channel Member",
  description:
    "Fires when someone is added to a channel. The run gets the membership's id, the person's user id, name, email and roles.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, hint: "From List Teams." },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: "From List Channels.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "roles", type: "array", label: "Roles" },
  ],
  sample: {
    id: "MmY0YjAyMjMtMzg1Mi00ZGZiLTgyOGYtOGIyZmFhYjMwMjViIyM4OTJmM2M4Yw==",
    userId: "892f3c8c-8b7c-4b7a-9b23-0fd1f5f8a111",
    displayName: "Alex Example",
    email: "alex@example.com",
    roles: [],
  },
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
  poll({ params, state }, ctx) {
    return snapshotAdded(
      listChannelMembers,
      { teamId: params.teamId, channelId: params.channelId, top: PAGE_SIZE },
      state,
      ctx,
      "channel members",
    );
  },
};

export default newChannelMember;
