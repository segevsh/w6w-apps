import channelList from "../actions/channel-list.ts";
import { drainPages, snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/channels?limit=100[&next_token=…]` through `channel-list`: pages of at most 100 with
 * `next_token`/`has_more` (https://www.zoho.com/cliq/help/restapi/v2/, "Channels"). The page order
 * is not guaranteed, so every page is read and the whole collection snapshot-diffed (additions
 * only; more than 50 pages throws).
 */
export default snapshotTrigger({
  key: "new-channel",
  title: "New Channel",
  description:
    "The run gets each channel that appears in the organization after the trigger was enabled.",
  output: [
    { key: "channel_id", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "unique_name", type: "string", label: "Unique name" },
    { key: "chat_id", type: "string", label: "Channel chat ID" },
    { key: "level", type: "string", label: "Level" },
    { key: "participant_count", type: "number", label: "Participants" },
    { key: "creation_time", type: "string", label: "Created at" },
  ],
  sample: {
    channel_id: "O1864232000000076001",
    name: "#Marketing",
    unique_name: "marketing",
    chat_id: "CT_1254880203691219668_11543281",
    level: "organization",
    participant_count: 15,
    creation_time: "2026-11-09T04:00:00-07:00",
  },
  rows: (_params, ctx) =>
    drainPages(async (nextToken) => {
      const out = await channelList.execute({ limit: 100, nextToken }, ctx);
      return { items: out.channels, next: out.nextToken };
    }),
  idOf: (item) => str((item as { channel_id?: unknown }).channel_id),
});
