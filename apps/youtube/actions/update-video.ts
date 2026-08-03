import type { ActionDefinition } from "@w6w/types";
import { csv, normalizePart, YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
  part: string | string[];
  title?: string;
  description?: string;
  tags?: string | string[];
  categoryId?: string;
  defaultLanguage?: string;
  privacyStatus?: string;
  embeddable?: boolean;
  license?: string;
  publicStatsViewable?: boolean;
  publishAt?: string;
  selfDeclaredMadeForKids?: boolean;
}

interface VideoSnippet {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
}

interface VideoStatus {
  privacyStatus?: string;
  embeddable?: boolean;
  license?: string;
  publicStatsViewable?: boolean;
  publishAt?: string;
  selfDeclaredMadeForKids?: boolean;
}

interface Payload {
  id: string;
  snippet?: VideoSnippet;
  status?: VideoStatus;
}

/**
 * `videos.update` — PUT /youtube/v3/videos
 * https://developers.google.com/youtube/v3/docs/videos/update
 *
 * **Quota: 50 units.** Fifty times a read, so batching edits matters.
 *
 * **This method is destructive, and `part` is the blast radius.** Google:
 * *"If you are submitting an update request, and your request does not specify a
 * value for a property that already has a value, the property's existing value
 * will be deleted."* The rule applies per named part — so `part=snippet` with
 * only a new title silently wipes the description and tags. There is no PATCH.
 *
 * Two guards follow from that, and both are enforced before the request leaves:
 *
 *   - A part is only ever sent if the caller supplied at least one field
 *     belonging to it. Naming `status` in `part` and filling in nothing would
 *     reset the video's privacy to default; that is refused rather than sent.
 *   - `part=snippet` additionally requires `title` **and** `categoryId`, which
 *     Google marks required on this method. Omitting `categoryId` is the classic
 *     way to get an opaque 400 here, so it fails locally with a clear message.
 *
 * The safe workflow is: `get-videos` with the same parts → change what you want
 * in the returned object → send the whole part back.
 */
const updateVideo: ActionDefinition<Input> = {
  key: "update-video",
  type: "perform",
  resource: "video",
  title: "Update Video",
  description:
    "Update a video's metadata. Costs 50 quota units. Destructive by design — any field you leave blank inside a part you name is CLEARED, so read the video first and send back complete parts.",
  // Sending the same full payload twice leaves the video in the same state.
  idempotent: true,
  params: [
    { key: "id", label: "Video ID", type: "string", required: true },
    {
      key: "part",
      label: "Part",
      type: "multiselect",
      required: true,
      default: "snippet",
      options: [
        { value: "snippet", label: "snippet (title, description, tags, category)" },
        { value: "status", label: "status (privacy, licence, scheduling)" },
      ],
      hint:
        "Which sections to WRITE. Every mutable field in a named part is overwritten — omitted ones are cleared. Only snippet and status carry fields this action can set.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Required whenever `snippet` is in Part. Max 100 characters.",
      validation: { maxLength: 100 },
      showIf: { in: ["snippet", { var: "part" }] },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Max 5000 characters. Cleared if omitted while `snippet` is in Part.",
      validation: { maxLength: 5000 },
      showIf: { in: ["snippet", { var: "part" }] },
    },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      hint: "Cleared if omitted while `snippet` is in Part.",
      showIf: { in: ["snippet", { var: "part" }] },
    },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint:
        "Required whenever `snippet` is in Part — Google rejects the update without it. Numeric, e.g. `22` (People & Blogs); the valid set is region-specific.",
      showIf: { in: ["snippet", { var: "part" }] },
    },
    {
      key: "defaultLanguage",
      label: "Default language",
      type: "string",
      hint: "BCP-47 code for the language of the title and description.",
      showIf: { in: ["snippet", { var: "part" }] },
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
      showIf: { in: ["status", { var: "part" }] },
    },
    {
      key: "embeddable",
      label: "Embeddable",
      type: "boolean",
      showIf: { in: ["status", { var: "part" }] },
    },
    {
      key: "license",
      label: "Licence",
      type: "select",
      options: [
        { value: "youtube", label: "Standard YouTube licence" },
        { value: "creativeCommon", label: "Creative Commons" },
      ],
      showIf: { in: ["status", { var: "part" }] },
    },
    {
      key: "publicStatsViewable",
      label: "Public stats viewable",
      type: "boolean",
      showIf: { in: ["status", { var: "part" }] },
    },
    {
      key: "publishAt",
      label: "Scheduled publish time (RFC 3339)",
      type: "datetime",
      hint: "Only honoured while Privacy is `private`.",
      showIf: { in: ["status", { var: "part" }] },
    },
    {
      key: "selfDeclaredMadeForKids",
      label: "Made for kids",
      type: "boolean",
      showIf: { in: ["status", { var: "part" }] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Video ID" },
    { key: "snippet", type: "object", label: "Snippet" },
    { key: "status", type: "object", label: "Status" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const parts = normalizePart(input.part).split(",");
    const payload: Payload = { id: input.id };

    if (parts.includes("snippet")) {
      if (!input.title || !input.categoryId) {
        throw new Error(
          "update-video: `part` includes `snippet`, so `title` and `categoryId` are both required — Google marks them required on videos.update and rejects the request otherwise",
        );
      }
      const snippet: VideoSnippet = { title: input.title, categoryId: input.categoryId };
      if (input.description !== undefined) snippet.description = input.description;
      const tags = csv(input.tags);
      if (tags !== undefined) snippet.tags = tags.split(",");
      if (input.defaultLanguage !== undefined) snippet.defaultLanguage = input.defaultLanguage;
      payload.snippet = snippet;
    }

    if (parts.includes("status")) {
      const status: VideoStatus = {};
      if (input.privacyStatus !== undefined) status.privacyStatus = input.privacyStatus;
      if (input.embeddable !== undefined) status.embeddable = input.embeddable;
      if (input.license !== undefined) status.license = input.license;
      if (input.publicStatsViewable !== undefined) {
        status.publicStatsViewable = input.publicStatsViewable;
      }
      if (input.publishAt !== undefined) status.publishAt = input.publishAt;
      if (input.selfDeclaredMadeForKids !== undefined) {
        status.selfDeclaredMadeForKids = input.selfDeclaredMadeForKids;
      }
      // An empty `status` part is a request to reset the video's privacy to the
      // default. Never send that by accident.
      if (Object.keys(status).length === 0) {
        throw new Error(
          "update-video: `part` includes `status` but no status field was supplied — that would clear the video's existing status, so it is refused",
        );
      }
      payload.status = status;
    }

    const client = new YouTubeClient(ctx);
    return client.request("/videos", {
      method: "PUT",
      part: parts,
      body: payload,
    });
  },
};

export default updateVideo;
