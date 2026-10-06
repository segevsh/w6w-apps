import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient, streamPath, TAG_LIKE, TAG_READ, TAG_STARRED } from "../lib/client.ts";

/**
 * `GET /reader/api/0/stream/contents/{streamId}` (zone 1) — articles of a stream. `streamId` is
 * appended to the path and must be URL-encoded. Parameters: `n` (default 20, max 100), `r=o`
 * (oldest first), `ot` (only items newer than this timestamp; with `r=o` the look-back is
 * clamped to about one month), `xt` (exclude target, e.g. read items), `it` (include target:
 * starred or like), `c` (continuation), `includeAllDirectStreamIds=false`, `annotations=1`,
 * `summaries=1`. "If the continuation string is missing, then you are at the end of the stream."
 *
 * This is the heavy call; for ids only, use `item-ids`, which the vendor asks callers to prefer.
 */
interface Input {
  streamId: string;
  count?: number;
  order?: "newest" | "oldest";
  newerThan?: number;
  excludeRead?: boolean;
  onlyLabel?: "starred" | "like";
  continuation?: string;
  onlyManualTags?: boolean;
  annotations?: boolean;
  summaries?: boolean;
}

const ONLY: Record<string, string> = { starred: TAG_STARRED, like: TAG_LIKE };

const streamContents: ActionDefinition<Input> = {
  key: "stream-contents",
  type: "read",
  resource: "streams",
  title: "Get Stream Contents",
  description: "Fetch the articles of a feed, folder, tag or system stream (up to 100 per call).",
  params: [
    {
      key: "streamId",
      label: "Stream ID",
      type: "string",
      required: true,
      default: "user/-/state/com.google/reading-list",
      placeholder: "user/-/label/Tech",
      hint: "A feed (`feed/<xml url>`), a folder or tag (`user/-/label/<name>`), or a system " +
        "stream: user/-/state/com.google/reading-list, read, starred, broadcast, annotated, " +
        "like or saved-web-pages.",
    },
    {
      key: "count",
      label: "Items",
      type: "number",
      default: 20,
      validation: { min: 1, max: 100, integer: true },
      hint: "Inoreader's default is 20 and its maximum is 100.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "newest",
      options: [
        { value: "newest", label: "Newest first" },
        { value: "oldest", label: "Oldest first" },
      ],
    },
    {
      key: "newerThan",
      label: "Newer than (unix timestamp)",
      type: "number",
      hint: "Seconds or microseconds. With oldest-first, anything older than about a month is " +
        "clamped to a month ago by Inoreader.",
    },
    { key: "excludeRead", label: "Unread only", type: "boolean", default: false },
    {
      key: "onlyLabel",
      label: "Only items that are",
      type: "select",
      options: [
        { value: "starred", label: "Starred" },
        { value: "like", label: "Liked" },
      ],
    },
    {
      key: "continuation",
      label: "Continuation",
      type: "string",
      hint: "The `continuation` value from the previous call, to fetch the next page.",
    },
    {
      key: "onlyManualTags",
      label: "Only manually added tags in categories",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Sends includeAllDirectStreamIds=false so folder tags are left out of `categories`.",
    },
    { key: "annotations", label: "Include annotations", type: "boolean", default: false },
    {
      key: "summaries",
      label: "Include Inoreader Intelligence summaries",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Stream ID as returned" },
    { key: "title", type: "string", label: "Stream title" },
    { key: "updated", type: "number", label: "Stream updated (unix seconds)" },
    { key: "items", type: "array", label: "Articles" },
    { key: "continuation", type: "string", label: "Next-page token (absent at the end)" },
  ],

  async execute(input, ctx) {
    const streamId = (input.streamId ?? "").trim();
    if (!streamId) throw new Error("streamId is required");
    const body = await new InoreaderClient(ctx).json<Record<string, unknown>>(
      `/stream/contents/${streamPath(streamId)}`,
      {
        query: {
          n: input.count,
          r: input.order === "oldest" ? "o" : undefined,
          ot: input.newerThan,
          xt: input.excludeRead ? TAG_READ : undefined,
          it: input.onlyLabel ? ONLY[input.onlyLabel] : undefined,
          c: input.continuation?.trim(),
          includeAllDirectStreamIds: input.onlyManualTags ? "false" : undefined,
          annotations: input.annotations ? 1 : undefined,
          summaries: input.summaries ? 1 : undefined,
        },
      },
    );
    return {
      id: body.id,
      title: body.title,
      updated: body.updated,
      items: Array.isArray(body.items) ? body.items : [],
      continuation: body.continuation,
    };
  },
};

export default streamContents;
