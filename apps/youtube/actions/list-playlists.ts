import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  id?: string | string[];
  channelId?: string;
  mine?: boolean;
  maxResults?: number;
  pageToken?: string;
  hl?: string;
}

/**
 * `playlists.list` — GET /youtube/v3/playlists
 * https://developers.google.com/youtube/v3/docs/playlists/list
 *
 * **Quota: 1 unit.**
 *
 * Exactly one filter — `id`, `channelId` or `mine` — as with the other list
 * endpoints. `mine=true` needs OAuth.
 *
 * Worth knowing: a channel's *uploads* playlist is not returned here. It is a
 * system playlist, and its id comes from `get-channels` with
 * `part=contentDetails` (`contentDetails.relatedPlaylists.uploads`).
 */
const listPlaylists: ActionDefinition<Input> = {
  key: "list-playlists",
  type: "read",
  resource: "playlist",
  title: "List Playlists",
  description:
    "List playlists by ID, by channel, or the authenticated user's own. Costs 1 quota unit. Does not include the system uploads playlist — get that ID from Get Channels with the contentDetails part.",
  params: [
    partParam(
      "playlist",
      "snippet,contentDetails",
      "Sections to return. `contentDetails` carries the item count; `status` carries the privacy setting.",
    ),
    {
      key: "id",
      label: "Playlist IDs",
      type: "multiselect",
      hint: "One or more playlist IDs. Exactly one filter is required.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Playlists owned by a channel.",
    },
    {
      key: "mine",
      label: "My playlists",
      type: "boolean",
      hint: "Requires an OAuth connection.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "0–50. Google's default is 5.",
      validation: { integer: true, min: 0, max: 50 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "hl", label: "Localisation language", type: "string", hint: "BCP-47 code." },
  ],
  output: [
    { key: "items", type: "array", label: "Playlists" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    const filters = [id, input.channelId, input.mine ? "mine" : undefined].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "list-playlists: supply exactly one of `id`, `channelId` or `mine` — the API rejects zero or several",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/playlists", {
      part: input.part,
      query: {
        id,
        channelId: input.channelId,
        mine: input.mine,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        hl: input.hl,
      },
    });
  },
};

export default listPlaylists;
