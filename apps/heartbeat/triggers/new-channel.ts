import { snapshotTrigger } from "../lib/triggers.ts";
import listChannels from "../actions/list-channels.ts";

/**
 * `GET /v0/channels` returns every channel in one unpaged response (no limit, cursor or sort;
 * https://heartbeat.readme.io/reference/getchannels), one community's own channels (bounded; the kit caps a snapshot at 5000 rows), so each
 * check diffs the ids against the previous one (`pollSnapshot`, added only).
 */
export default snapshotTrigger({
  key: "new-channel",
  title: "New Channel",
  description:
    "The run gets each newly created channel (post, chat or voice) of the Heartbeat community.",
  action: listChannels,
  field: "channels",
  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "emoji", type: "string", label: "Emoji" },
    { key: "type", type: "string", label: "Channel type" },
    { key: "isDraft", type: "boolean", label: "Is a draft" },
  ],
  sample: {
    id: "9e455d01-82d8-41a4-a176-fa4d9462e08b",
    name: "general",
    emoji: "👋",
    type: "POSTS",
    isDraft: false,
  },
});
