import type { Param } from "@w6w/types";
import { parseJson, pick } from "./client.ts";
import { bool, json, str, text } from "./params.ts";

/** The fields of a scheduled post the create/update actions share (`ScheduledPost` schema). */
export interface PostInput {
  text: string;
  publicationDate: string;
  timezone?: string;
  providers: unknown;
  media?: string[] | string;
  firstCommentText?: string;
  autoPublish?: boolean;
  draft?: boolean;
  shortener?: boolean;
  saveExternalMediaFiles?: boolean;
  networkData?: unknown;
}

export const postFields: Param[] = [
  text("text", "Text", { required: true, hint: "The post's text." }),
  str("publicationDate", "Publication date", {
    required: true,
    hint: "Local date-time without offset, e.g. 2026-11-03T10:15:30. The timezone below applies.",
  }),
  str("timezone", "Timezone", {
    hint: "IANA timezone of the publication date, e.g. Europe/Madrid.",
  }),
  json("providers", "Networks", {
    required: true,
    hint: 'Array of targets, e.g. [{"network":"instagram"}]. At least one; network names are ' +
      "Metricool's own, as returned on the posts you already have.",
  }),
  json("media", "Media URLs", { hint: "Array of publicly reachable media URLs." }),
  text("firstCommentText", "First comment", { hint: "Text posted as the first comment." }),
  bool("autoPublish", "Auto-publish", {
    hint: "Publish automatically rather than send a reminder.",
  }),
  bool("draft", "Draft", { hint: "Save as a draft instead of scheduling." }),
  bool("shortener", "Shorten links"),
  bool("saveExternalMediaFiles", "Save external media", {
    hint: "Copy media from external URLs into Metricool.",
  }),
  json("networkData", "Per-network settings", {
    hint:
      'Object merged into the post, for the vendor\'s per-network blocks, e.g. {"instagramData":' +
      '{"type":"POST"}} or {"youtubeData":{"title":"…"}}. Keys are top-level ScheduledPost fields.',
  }),
];

export function postBody(input: PostInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ...(parseJson(input.networkData, "networkData") as Record<string, unknown> | undefined),
    ...pick(input, [
      "text",
      "firstCommentText",
      "autoPublish",
      "draft",
      "shortener",
      "saveExternalMediaFiles",
    ]),
    publicationDate: {
      dateTime: input.publicationDate,
      ...(input.timezone ? { timezone: input.timezone } : {}),
    },
    providers: parseJson(input.providers, "providers"),
  };
  if (input.media !== undefined && input.media !== "") body.media = parseJson(input.media, "media");
  return body;
}

export const postOutput = [
  { key: "id", type: "number", label: "Post ID" },
  { key: "text", type: "string", label: "Text" },
  { key: "publicationDate", type: "object", label: "Publication date ({dateTime, timezone})" },
  { key: "providers", type: "array", label: "Networks and their status" },
  { key: "draft", type: "boolean", label: "Is a draft" },
] as const;
