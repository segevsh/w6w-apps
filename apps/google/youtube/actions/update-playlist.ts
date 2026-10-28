import type { ActionDefinition } from "@w6w/types";
import { csv, normalizePart, YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
  part: string | string[];
  title: string;
  description?: string;
  tags?: string | string[];
  defaultLanguage?: string;
  privacyStatus?: string;
}

interface Payload {
  id: string;
  snippet: {
    title: string;
    description?: string;
    tags?: string[];
    defaultLanguage?: string;
  };
  status?: { privacyStatus?: string };
}

/**
 * `playlists.update` — PUT /youtube/v3/playlists
 * https://developers.google.com/youtube/v3/docs/playlists/update
 *
 * **Quota: 50 units.**
 *
 * Same destructive semantics as `videos.update`: there is no PATCH, and any
 * mutable field omitted from a part named in `part` is cleared. Google marks
 * `id` and `snippet.title` required on this method, and `snippet` is always
 * written, so `title` is required here too — omitting it to "leave the title
 * alone" is exactly the mistake that wipes it.
 *
 * Read the playlist with `list-playlists` first, then send back the parts you
 * want to keep.
 */
const updatePlaylist: ActionDefinition<Input> = {
  key: "update-playlist",
  type: "perform",
  resource: "playlist",
  title: "Update Playlist",
  description:
    "Update a playlist's title, description, tags or privacy. Costs 50 quota units. Destructive — fields omitted from a part you name are CLEARED, and the API requires the title on every update.",
  idempotent: true,
  params: [
    { key: "id", label: "Playlist ID", type: "string", required: true },
    {
      key: "part",
      label: "Part",
      type: "multiselect",
      required: true,
      default: "snippet",
      options: [
        { value: "snippet", label: "snippet (title, description, tags)" },
        { value: "status", label: "status (privacy)" },
      ],
      hint:
        "Which sections to WRITE. `snippet` is always written because the API requires the title; `status` is added automatically when a privacy setting is supplied.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint:
        "Required by the API on every update — omitting it does not preserve the existing title, it fails the request. Max 150 characters.",
      validation: { maxLength: 150 },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Cleared if omitted. Max 5000 characters.",
      validation: { maxLength: 5000 },
    },
    { key: "tags", label: "Tags", type: "multiselect", hint: "Cleared if omitted." },
    { key: "defaultLanguage", label: "Default language", type: "string", hint: "BCP-47 code." },
    {
      key: "privacyStatus",
      label: "Privacy",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "unlisted", label: "Unlisted" },
        { value: "private", label: "Private" },
      ],
      hint: "Supplying this adds `status` to Part automatically.",
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
    parts.add("snippet");

    const payload: Payload = { id: input.id, snippet: { title: input.title } };
    if (input.description !== undefined) payload.snippet.description = input.description;
    const tags = csv(input.tags);
    if (tags !== undefined) payload.snippet.tags = tags.split(",");
    if (input.defaultLanguage !== undefined) {
      payload.snippet.defaultLanguage = input.defaultLanguage;
    }
    if (input.privacyStatus !== undefined) {
      payload.status = { privacyStatus: input.privacyStatus };
      parts.add("status");
    }

    const client = new YouTubeClient(ctx);
    return client.request("/playlists", {
      method: "PUT",
      part: [...parts],
      body: payload,
    });
  },
};

export default updatePlaylist;
