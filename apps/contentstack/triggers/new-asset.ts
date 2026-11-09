import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAssets from "../actions/list-assets.ts";

export default pollFromListAction({
  key: "new-asset",
  title: "New Asset",
  description: "The run gets each newly created asset.",
  action: listAssets,
  input: () => ({ desc: "created_at", limit: 100, skip: 0 }),
  items: (result) => (result as { assets?: unknown[] }).assets ?? [],
  idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
  output: [{ key: "uid", type: "string", label: "Asset UID" }],
  sample: { uid: "asset-1" },
  maxPages: 1,
});
