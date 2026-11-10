import { pollFromListAction } from "../../_shared/poll/mod.ts";
import mediaList from "../actions/media-list.ts";

// Newest first: `sort=uploadAt,desc` (https://developers.eztexting.com/reference/list_5-1); the page is the
// vendor's 100-row size, one request per check.
export default pollFromListAction({
  key: "new-media-file",
  title: "New Media File",
  description: "The run gets each media file newly uploaded to the account (newest first).",
  action: mediaList,
  input: () => ({ page: 0, size: "100", sort: "uploadAt,desc" }),
  items: (result) =>
    Array.isArray((result as { content?: unknown[] }).content)
      ? (result as { content: unknown[] }).content
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Media file ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "type", type: "string", label: "Media file type" },
    { key: "url", type: "string", label: "Media file URL" },
    { key: "uploadAt", type: "string", label: "Uploaded at" },
  ],
  sample: {
    id: "media-2001",
    name: "promo.png",
    type: "image/png",
    url: "https://example.com/promo.png",
    uploadAt: "2026-11-09T12:00:00Z",
  },
  maxPages: 1,
});
