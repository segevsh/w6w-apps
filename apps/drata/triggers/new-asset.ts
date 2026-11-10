import { pollFromListAction } from "../../_shared/poll/mod.ts";
import assetList from "../actions/asset-list.ts";

export default pollFromListAction({
  key: "new-asset",
  title: "New Asset",
  description: "The run gets each new asset.",
  action: assetList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Asset ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
