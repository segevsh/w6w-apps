import type { TriggerDefinition } from "@w6w/types";
import listChannels from "../actions/list-channels.ts";
import { snapshotAdded, TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

interface Params {
  teamId: string;
}

/**
 * `GET /teams/{team-id}/channels` — the same request as List Channels. A team has a bounded number
 * of channels, so the list is read whole each check and compared with the last one
 * (https://learn.microsoft.com/en-us/graph/api/channel-list, verified 2026-11-10).
 */
const newChannel: TriggerDefinition<Params> = {
  key: "new-channel",
  title: "New Channel",
  description:
    "Fires when a new channel is added to a team. The run gets the channel's id, name, description, type and link.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, hint: "From List Teams." },
  ],
  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "membershipType", type: "string", label: "Type (standard, private, shared)" },
    { key: "webUrl", type: "string", label: "Link" },
  ],
  sample: {
    id: "19:561082c0f3f847a58069deb8eb300807@thread.skype",
    displayName: "Announcements",
    description: "Company news",
    membershipType: "standard",
    webUrl:
      "https://teams.microsoft.com/l/channel/19%3A561082c0f3f847a58069deb8eb300807%40thread.skype/Announcements",
  },
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
  poll({ params, state }, ctx) {
    return snapshotAdded(listChannels, { teamId: params.teamId }, state, ctx, "channels");
  },
};

export default newChannel;
