import type { ActionDefinition } from "@w6w/types";
import { normalizePart, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  playlistId: string;
  videoId: string;
  position?: number;
  note?: string;
  startAt?: string;
  endAt?: string;
}

interface Payload {
  snippet: {
    playlistId: string;
    resourceId: { kind: string; videoId: string };
    position?: number;
  };
  contentDetails?: { note?: string; startAt?: string; endAt?: string };
}

/**
 * `playlistItems.insert` — POST /youtube/v3/playlistItems
 * https://developers.google.com/youtube/v3/docs/playlistItems/insert
 *
 * **Quota: 50 units.**
 *
 * The body shape is the part people get wrong: the video is identified by a
 * nested `snippet.resourceId` object — `{ kind: "youtube#video", videoId }` —
 * not by a bare `videoId` field. A plain `videoId` is silently ignored and the
 * request fails as if no video were supplied. That object is constructed here so
 * a caller only ever passes the id.
 *
 * `contentDetails` is only added to `part` when a note or start/end offset is
 * supplied, so the request never names a part it has nothing to write into.
 *
 * Adding the same video twice creates two distinct entries — YouTube allows
 * duplicates — so this is `idempotent: false`.
 */
const addPlaylistItem: ActionDefinition<Input> = {
  key: "add-playlist-item",
  type: "perform",
  resource: "playlistItem",
  title: "Add Video To Playlist",
  description:
    "Add a video to a playlist. Costs 50 quota units. Not idempotent — adding the same video twice creates two entries.",
  idempotent: false,
  params: [
    {
      key: "part",
      label: "Part",
      type: "multiselect",
      required: true,
      default: "snippet",
      options: [
        { value: "snippet", label: "snippet (playlist, video, position)" },
        { value: "contentDetails", label: "contentDetails (note, start/end offsets)" },
        { value: "status", label: "status (response only)" },
      ],
      hint:
        "What the write sets and what the response returns. `snippet` is always included; `contentDetails` is added automatically when a note or offset is supplied.",
    },
    { key: "playlistId", label: "Playlist ID", type: "string", required: true },
    {
      key: "videoId",
      label: "Video ID",
      type: "string",
      required: true,
      hint: "Wrapped into snippet.resourceId for you — pass the bare ID.",
    },
    {
      key: "position",
      label: "Position",
      type: "number",
      hint: "Zero-based. Omit to append to the end.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "Max 280 characters. Adds `contentDetails` to Part.",
      validation: { maxLength: 280 },
    },
    {
      key: "startAt",
      label: "Start at",
      type: "string",
      hint: "ISO 8601 duration, e.g. `PT1M30S`. Adds `contentDetails` to Part.",
    },
    {
      key: "endAt",
      label: "End at",
      type: "string",
      hint: "ISO 8601 duration, e.g. `PT3M`. Adds `contentDetails` to Part.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Playlist item ID" },
    { key: "snippet", type: "object", label: "Snippet" },
    { key: "contentDetails", type: "object", label: "Content details" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const parts = new Set(normalizePart(input.part).split(","));
    parts.add("snippet");

    const payload: Payload = {
      snippet: {
        playlistId: input.playlistId,
        // The nested resourceId is mandatory — a bare videoId is ignored.
        resourceId: { kind: "youtube#video", videoId: input.videoId },
      },
    };
    if (input.position !== undefined) payload.snippet.position = input.position;

    const details: { note?: string; startAt?: string; endAt?: string } = {};
    if (input.note !== undefined) details.note = input.note;
    if (input.startAt !== undefined) details.startAt = input.startAt;
    if (input.endAt !== undefined) details.endAt = input.endAt;
    if (Object.keys(details).length > 0) {
      payload.contentDetails = details;
      parts.add("contentDetails");
    }

    const client = new YouTubeClient(ctx);
    return client.request("/playlistItems", {
      method: "POST",
      part: [...parts],
      body: payload,
    });
  },
};

export default addPlaylistItem;
