import type { ActionDefinition } from "@w6w/types";
import { csv, normalizePart, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  title: string;
  description?: string;
  tags?: string | string[];
  defaultLanguage?: string;
  privacyStatus?: string;
}

interface Payload {
  snippet: {
    title: string;
    description?: string;
    tags?: string[];
    defaultLanguage?: string;
  };
  status?: { privacyStatus?: string };
}

/**
 * `playlists.insert` — POST /youtube/v3/playlists
 * https://developers.google.com/youtube/v3/docs/playlists/insert
 *
 * **Quota: 50 units.**
 *
 * `part` does double duty on insert: it names what the write sets *and* what the
 * response returns. `snippet` is always sent because `snippet.title` is required
 * by the API; `status` is only sent when a privacy setting was supplied, and is
 * added to `part` automatically in that case so the two can never disagree.
 *
 * YouTube mints a fresh playlist id per call, so a retry creates a duplicate —
 * hence `idempotent: false`.
 */
const createPlaylist: ActionDefinition<Input> = {
  key: "create-playlist",
  type: "perform",
  resource: "playlist",
  title: "Create Playlist",
  description:
    "Create a playlist on the authenticated user's channel. Costs 50 quota units. Not idempotent — each call creates a new playlist.",
  idempotent: false,
  params: [
    {
      key: "part",
      label: "Part",
      type: "multiselect",
      required: true,
      default: "snippet,status",
      options: [
        { value: "snippet", label: "snippet (title, description, tags)" },
        { value: "status", label: "status (privacy)" },
        { value: "contentDetails", label: "contentDetails (response only)" },
        { value: "player", label: "player (response only)" },
      ],
      hint:
        "What the write sets and what the response returns. `snippet` is always included — the API requires a title. `status` is added automatically when a privacy setting is supplied.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Required by the API. Max 150 characters.",
      validation: { maxLength: 150 },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Max 5000 characters.",
      validation: { maxLength: 5000 },
    },
    { key: "tags", label: "Tags", type: "multiselect" },
    {
      key: "defaultLanguage",
      label: "Default language",
      type: "string",
      hint: "BCP-47 code for the language of the title and description.",
    },
    {
      key: "privacyStatus",
      label: "Privacy",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "unlisted", label: "Unlisted" },
        { value: "private", label: "Private" },
      ],
      hint: "Omit to accept YouTube's default. Supplying this adds `status` to Part automatically.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Playlist ID" },
    { key: "snippet", type: "object", label: "Snippet" },
    { key: "status", type: "object", label: "Status" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const parts = new Set(normalizePart(input.part).split(","));
    // `snippet` carries the required title, so it is never optional here.
    parts.add("snippet");

    const payload: Payload = { snippet: { title: input.title } };
    if (input.description !== undefined) payload.snippet.description = input.description;
    const tags = csv(input.tags);
    if (tags !== undefined) payload.snippet.tags = tags.split(",");
    if (input.defaultLanguage !== undefined) {
      payload.snippet.defaultLanguage = input.defaultLanguage;
    }
    if (input.privacyStatus !== undefined) {
      payload.status = { privacyStatus: input.privacyStatus };
      // Keep `part` and the body consistent: a status body with no `status` in
      // `part` is silently dropped by the API.
      parts.add("status");
    }

    const client = new YouTubeClient(ctx);
    return client.request("/playlists", {
      method: "POST",
      part: [...parts],
      body: payload,
    });
  },
};

export default createPlaylist;
