import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
}

const playlistItemList: ActionDefinition<Input> = {
  key: "playlist-item-list",
  type: "search",
  resource: "content",
  title: "List Playlist Items",
  description: "List a content item's playlist items (formerly chapters) and file resources.",
  params: [
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "required": true,
      "hint": "A video, collection or live event id.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "totalCount", type: "number", label: "Total-Count header (null when absent)" },
    {
      key: "totalCountCapped",
      type: "boolean",
      label: "True when the total was reported as 10000+",
    },
    { key: "page", type: "number", label: "Page returned" },
    { key: "nextPage", type: "number", label: "Next page number, or null on the last page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new UscreenClient(ctx).list(`/contents/${seg(input.contentId)}/playlist_items`, {});
  },
};

export default playlistItemList;
