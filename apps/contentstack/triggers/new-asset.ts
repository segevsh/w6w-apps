import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAssets from "../actions/list-assets.ts";

export const assetOutput = [
  { key: "uid", type: "string" as const, label: "Asset UID" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "filename", type: "string" as const, label: "File name" },
  { key: "content_type", type: "string" as const, label: "Content type" },
  { key: "created_at", type: "string" as const, label: "Created at" },
  { key: "updated_at", type: "string" as const, label: "Updated at" },
];

export const assetSample = {
  uid: "blt0123456789abcdef",
  title: "hero.png",
  filename: "hero.png",
  content_type: "image/png",
  created_at: "2026-11-09T10:00:00.000Z",
  updated_at: "2026-11-09T10:00:00.000Z",
};

export const assetItems = (result: unknown) => (result as { assets?: unknown[] }).assets ?? [];

export default pollFromListAction({
  key: "new-asset",
  title: "New Asset",
  description: "The run gets each newly created asset.",
  action: listAssets,
  input: () => ({ desc: "created_at", limit: 100, skip: 0 }),
  items: assetItems,
  idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
  output: assetOutput,
  sample: assetSample,
  maxPages: 1,
});
