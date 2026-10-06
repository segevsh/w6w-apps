import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient, TAG_LIKE, TAG_READ, TAG_STARRED } from "../lib/client.ts";

/**
 * `GET /reader/api/0/stream/items/ids` (zone 1) — only the article ids of a stream. The vendor
 * asks callers to use this rather than `stream/contents` for anything that does not need
 * content: "it is a lot lighter for our backend". Parameters: `s` (stream id, a QUERY
 * parameter here, unlike `stream/contents`), `n` (default 20, max 1000), `r=o`, `ot`, `xt`, `it`,
 * `c`, `includeAllDirectStreamIds=false`. The response has `itemRefs` of `{id, directStreamIds,
 * timestampUsec}` (ids in the SHORT decimal form) and a `continuation`.
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
}

const ONLY: Record<string, string> = { starred: TAG_STARRED, like: TAG_LIKE };

const itemIds: ActionDefinition<Input> = {
  key: "item-ids",
  type: "read",
  resource: "streams",
  title: "List Item IDs",
  description: "List article ids (no content) for a stream, up to 1000 per call.",
  params: [
    {
      key: "streamId",
      label: "Stream ID",
      type: "string",
      required: true,
      default: "user/-/state/com.google/reading-list",
      placeholder: "user/-/label/Tech",
      hint: "A feed, folder, tag or system stream.",
    },
    {
      key: "count",
      label: "Items",
      type: "number",
      default: 20,
      validation: { min: 1, max: 1000, integer: true },
      hint: "Inoreader's default is 20 and its maximum is 1000.",
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
      hint: "Seconds or microseconds.",
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
      hint: "The `continuation` value from the previous call.",
    },
    {
      key: "onlyManualTags",
      label: "Only manually added tags",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Sends includeAllDirectStreamIds=false so folder tags are left out.",
    },
  ],
  output: [
    {
      key: "itemRefs",
      type: "array",
      label: "Item references (id, directStreamIds, timestampUsec)",
    },
    { key: "ids", type: "array", label: "Just the ids" },
    { key: "continuation", type: "string", label: "Next-page token (absent at the end)" },
  ],

  async execute(input, ctx) {
    const streamId = (input.streamId ?? "").trim();
    if (!streamId) throw new Error("streamId is required");
    const body = await new InoreaderClient(ctx).json<Record<string, unknown>>(
      "/stream/items/ids",
      {
        query: {
          s: streamId,
          n: input.count,
          r: input.order === "oldest" ? "o" : undefined,
          ot: input.newerThan,
          xt: input.excludeRead ? TAG_READ : undefined,
          it: input.onlyLabel ? ONLY[input.onlyLabel] : undefined,
          c: input.continuation?.trim(),
          output: "json",
          includeAllDirectStreamIds: input.onlyManualTags ? "false" : undefined,
        },
      },
    );
    const itemRefs = Array.isArray(body.itemRefs) ? body.itemRefs as Array<{ id?: string }> : [];
    return {
      itemRefs,
      ids: itemRefs.map((r) => r.id).filter((id): id is string => typeof id === "string"),
      continuation: body.continuation,
    };
  },
};

export default itemIds;
