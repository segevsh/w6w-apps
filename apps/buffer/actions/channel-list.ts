import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, unset } from "../lib/client.ts";
import {
  CHANNEL_FIELDS,
  channelOutput,
  organizationIdParam,
  productOptions,
} from "../lib/params.ts";

/**
 * `query channels(input: ChannelsInput!)` — the connected social profiles.
 *
 * A *channel* is Buffer's word for one connected profile: *"your company's X
 * account or your personal Instagram"*. Everything postable hangs off one, and
 * `post-create` needs a channel id, so this is the second call in most
 * workflows after `organization-list`.
 *
 * ## Not a connection — no pagination here
 *
 * The return type is `[Channel!]!`, a plain list. `posts` and `ideas` are the
 * only two Relay connections in the whole schema, so this action has no
 * `first`/`after` and adding them would be inventing an interface. An
 * organization's channel count is bounded by its plan anyway.
 *
 * ## The filters are exactly two, and there is no service filter
 *
 * `ChannelsFiltersInput` has `isLocked` and `product`, and nothing else.
 * Specifically there is **no filter by network**, which is the one a workflow
 * author reaches for first — filter the result set instead, on `service`.
 * Offering a "network" dropdown that quietly did nothing would be worse than
 * its absence.
 *
 * `isLocked` is worth understanding rather than passing through blind: Buffer
 * locks channels when *"the organization downgrades and reduces the channel
 * quantity of their plan"*, and *"Locked channels can't be used for posting"*.
 * So `isLocked: false` is the filter that answers "what can I actually post
 * to", and it is offered as a three-state select rather than a boolean because
 * omitting the filter (all channels) is a distinct and common choice from
 * asking for the unlocked ones.
 *
 * ## Two more fields worth reading off the result
 *
 * `isDisconnected` — the network revoked Buffer's access; posts to it will
 * fail. And `isQueuePaused` — *"a paused queue means scheduled posts won't be
 * published"*, so a `post-create` with `mode: addToQueue` against a paused
 * channel succeeds and then sits there. Neither is a filter; both are in the
 * selection so a workflow can branch on them.
 *
 * `postingSchedule` is not selected. It is a per-day array of slot times, which
 * is a real thing to want but costs a nested object on every channel in the
 * organization to answer a question this action is not about.
 */
const CHANNELS_QUERY = `query W6wChannels($input: ChannelsInput!) {
  channels(input: $input) {
${CHANNEL_FIELDS}
  }
}`;

interface Input {
  organizationId: string;
  locked?: string;
  product?: string;
}

const channelList: ActionDefinition<Input> = {
  key: "channel-list",
  type: "search",
  resource: "channel",
  title: "List Channels",
  description:
    "Every connected social profile in an organization, with its network, handle and whether " +
    "it is locked, disconnected or has a paused queue.",
  params: [
    organizationIdParam,
    {
      key: "locked",
      label: "Locked",
      type: "select",
      options: [
        { value: "false", label: "Unlocked only", description: "Channels you can post to." },
        {
          value: "true",
          label: "Locked only",
          description: "Locked by a plan downgrade — posting is blocked.",
        },
      ],
      hint: "Omit for all channels. Buffer locks channels when a plan downgrade cuts the " +
        "channel allowance, and a locked channel cannot be posted to.",
    },
    {
      key: "product",
      label: "Product",
      type: "select",
      options: productOptions,
      advanced: true,
      hint: "Return only channels the named Buffer product supports.",
    },
  ],
  output: channelOutput,

  execute(input, ctx) {
    const filter = compact({
      // A three-state select, so the string has to become a real boolean —
      // `"false"` is truthy and would invert the filter.
      isLocked: input.locked === undefined || input.locked === ""
        ? undefined
        : input.locked === "true",
      product: unset(input.product),
    });
    return new BufferClient(ctx).request(CHANNELS_QUERY, {
      input: compact({
        organizationId: input.organizationId,
        filter: Object.keys(filter).length ? filter : undefined,
      }),
    });
  },
};

export default channelList;
