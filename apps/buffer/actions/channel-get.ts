import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";
import { CHANNEL_FIELDS, channelIdParam, channelOutput } from "../lib/params.ts";

/**
 * `query channel(input: ChannelInput!)` — one channel by id.
 *
 * `ChannelInput` has exactly one field, `id`, and no organization is needed:
 * the channel id resolves on its own and carries `organizationId` back in the
 * response.
 *
 * Selects the same field set as `channel-list` plus `postingSchedule` — the
 * per-day slot times Buffer fills when `post-create` runs with
 * `mode: addToQueue`. That is affordable for a single channel where it is not
 * for a whole organization's worth, and it is the field that answers "when will
 * a queued post actually go out".
 */
const CHANNEL_QUERY = `query W6wChannel($input: ChannelInput!) {
  channel(input: $input) {
${CHANNEL_FIELDS}
    postingSchedule { day times paused }
  }
}`;

interface Input {
  channelId: string;
}

const channelGet: ActionDefinition<Input> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description:
    "One connected profile by id, including its weekly posting schedule — the slots Buffer " +
    "fills when a post is added to the queue.",
  params: [channelIdParam],
  output: [
    ...channelOutput,
    { key: "postingSchedule", type: "array", label: "Posting schedule" },
  ],

  execute(input, ctx) {
    return new BufferClient(ctx).request(CHANNEL_QUERY, {
      input: { id: input.channelId },
    });
  },
};

export default channelGet;
