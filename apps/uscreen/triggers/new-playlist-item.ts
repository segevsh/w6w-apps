import playlistItemList from "../actions/playlist-item-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /contents/{content_id}/playlist_items`: one content item's chapters and file resources, a
 * short list the user picks the parent of (`contentId`); the endpoint takes no filter or page, so
 * each check reads it and emits ids not seen before (https://uscreen.io/api/publisher.yml,
 * verified 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-playlist-item",
  title: "New Playlist Item",
  description:
    "The run gets each playlist item (chapter or file) newly added to the chosen content.",
  action: playlistItemList as never,
  params: [{
    key: "contentId",
    label: "Content ID",
    type: "string",
    required: true,
    hint: "A video, collection or live event id.",
  }],
  paged: false,
  output: [
    { key: "id", type: "number", label: "Playlist item ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "chapter_type", type: "string", label: "Chapter type" },
  ],
  sample: { id: 601, title: "Chapter 1", chapter_type: "video" },
});
