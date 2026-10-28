import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  id?: string | string[];
  mine?: boolean;
  forHandle?: string;
  forUsername?: string;
  managedByMe?: boolean;
  maxResults?: number;
  pageToken?: string;
  hl?: string;
}

/**
 * `channels.list` — GET /youtube/v3/channels
 * https://developers.google.com/youtube/v3/docs/channels/list
 *
 * **Quota: 1 unit.** The cheapest useful call in the API, which is why the
 * `oauth2` auth `test` hook uses it as a whoami.
 *
 * Exactly one filter is required, and which one you use is the thing people get
 * wrong:
 *
 *   - `mine=true` — the authenticated user's own channel. **OAuth only**; an API
 *     key has no "me" and this returns 401.
 *   - `id` — one or more channel ids (`UC…`). Works with an API key.
 *   - `forHandle` — the modern `@handle`, with or without the leading `@`.
 *   - `forUsername` — the *legacy* pre-2012 username. Most channels do not have
 *     one; if you have an `@handle`, `forHandle` is what you want.
 *
 * The uploads playlist id lives in `contentDetails.relatedPlaylists.uploads` —
 * request `part=contentDetails` here and feed it to `list-playlist-items` to walk
 * a channel's uploads for 1 unit a page, which is far cheaper than `search`.
 */
const getChannels: ActionDefinition<Input> = {
  key: "get-channels",
  type: "read",
  resource: "channel",
  title: "Get Channels",
  description:
    "Fetch channel detail by ID, @handle, legacy username, or the authenticated user's own channel. Costs 1 quota unit. Request the contentDetails part to get the uploads playlist ID.",
  params: [
    partParam(
      "channel",
      "snippet,statistics",
      "Sections to return. `statistics` carries subscriber/view/video counts; `contentDetails` carries the uploads playlist ID; `brandingSettings` carries channel art and keywords.",
    ),
    {
      key: "id",
      label: "Channel IDs",
      type: "multiselect",
      hint: "One or more `UC…` channel IDs. Exactly one filter is required.",
    },
    {
      key: "mine",
      label: "My channel",
      type: "boolean",
      hint: "The authenticated user's own channel. Requires an OAuth connection.",
    },
    {
      key: "forHandle",
      label: "Handle",
      type: "string",
      hint: "The modern `@handle`, with or without the `@`.",
    },
    {
      key: "forUsername",
      label: "Legacy username",
      type: "string",
      hint: "The pre-2012 username. Most channels have none — prefer Handle.",
    },
    {
      key: "managedByMe",
      label: "Managed by me",
      type: "boolean",
      hint: "Content-owner use only. Requires an OAuth connection with partner access.",
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
      key: "hl",
      label: "Localisation language",
      type: "string",
      hint: "BCP-47 code, e.g. `de`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Channels" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    const filters = [
      id,
      input.mine ? "mine" : undefined,
      input.forHandle,
      input.forUsername,
      input.managedByMe ? "managedByMe" : undefined,
    ].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "get-channels: supply exactly one of `id`, `mine`, `forHandle`, `forUsername` or `managedByMe` — the API rejects zero or several",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/channels", {
      part: input.part,
      query: {
        id,
        mine: input.mine,
        forHandle: input.forHandle,
        forUsername: input.forUsername,
        managedByMe: input.managedByMe,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        hl: input.hl,
      },
    });
  },
};

export default getChannels;
