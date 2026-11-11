import type { ActionDefinition } from "@w6w/types";
import channelList from "../actions/channel-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** The `channels` query takes no arguments and the reference documents no paging, so a team's
 * channels come back as one response and each check diffs their ids.
 * https://docs.fireflies.ai/graphql-api/query/channels */
export default snapshotTrigger({
  key: "new-channel",
  title: "New Channel",
  description: "The run gets each channel newly created on the Fireflies team.",
  action: channelList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { channels?: unknown[] }).channels ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "is_private", type: "boolean", label: "Private" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "channel-1",
    title: "Sales calls",
    is_private: false,
    created_at: "2026-11-09T09:00:00.000Z",
    members: [],
  },
});
