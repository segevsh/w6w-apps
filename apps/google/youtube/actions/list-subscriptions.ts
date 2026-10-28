import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  mine?: boolean;
  channelId?: string;
  id?: string | string[];
  mySubscribers?: boolean;
  forChannelId?: string;
  maxResults?: number;
  pageToken?: string;
  order?: string;
}

/**
 * `subscriptions.list` — GET /youtube/v3/subscriptions
 * https://developers.google.com/youtube/v3/docs/subscriptions/list
 *
 * **Quota: 1 unit per page.**
 *
 * The two directions read almost identically and mean opposite things:
 *   - `mine=true` — channels the authenticated user subscribes **to**.
 *   - `mySubscribers=true` — channels that subscribe **to** the authenticated
 *     user. YouTube only ever returns a partial list here; it is not a way to
 *     enumerate a subscriber base.
 *
 * `channelId` lists a *public* channel's own subscriptions, which most channels
 * keep private — an empty result usually means "hidden", not "none".
 *
 * `forChannelId` is a filter, not a selector: combined with `mine=true` it
 * answers "am I subscribed to this channel?" for one unit, which is the cheap
 * way to check before subscribing.
 */
const listSubscriptions: ActionDefinition<Input> = {
  key: "list-subscriptions",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List the channels the authenticated user subscribes to, a public channel's subscriptions, or a partial list of the user's own subscribers. Costs 1 quota unit per page. Requires an OAuth connection for the `mine` and `mySubscribers` filters.",
  params: [
    partParam(
      "subscription",
      "snippet",
      "Sections to return. `contentDetails` carries new-item counts; `subscriberSnippet` describes the subscriber and is only meaningful with My subscribers.",
    ),
    {
      key: "mine",
      label: "My subscriptions",
      type: "boolean",
      hint: "Channels the authenticated user subscribes to. Requires an OAuth connection.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "A public channel's own subscriptions. Empty usually means hidden, not none.",
    },
    { key: "id", label: "Subscription IDs", type: "multiselect" },
    {
      key: "mySubscribers",
      label: "My subscribers",
      type: "boolean",
      hint:
        "Channels subscribed to the authenticated user. YouTube returns a partial list only. Requires an OAuth connection.",
    },
    {
      key: "forChannelId",
      label: "Filter to channel IDs",
      type: "string",
      hint:
        "Comma-separated. Combine with My subscriptions to test whether the user is subscribed to a specific channel.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "0–50. Google's default is 5.",
      validation: { integer: true, min: 0, max: 50 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "unread", label: "Unread" },
        { value: "alphabetical", label: "Alphabetical" },
      ],
      hint: "Google's default is `relevance`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Subscriptions" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "prevPageToken", type: "string", label: "Previous page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    const filters = [
      id,
      input.mine ? "mine" : undefined,
      input.channelId,
      input.mySubscribers ? "mySubscribers" : undefined,
    ].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "list-subscriptions: supply exactly one of `id`, `mine`, `channelId` or `mySubscribers` — the API rejects zero or several",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/subscriptions", {
      part: input.part,
      query: {
        id,
        mine: input.mine,
        channelId: input.channelId,
        mySubscribers: input.mySubscribers,
        forChannelId: input.forChannelId,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        order: input.order,
      },
    });
  },
};

export default listSubscriptions;
