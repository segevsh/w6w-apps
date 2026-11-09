import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAssets from "../actions/list-assets.ts";
import { assetItems, assetOutput, assetSample } from "./new-asset.ts";

export default pollFromListAction({
  key: "new-or-updated-asset",
  title: "New or Updated Asset",
  description: "The run gets each asset that was created or edited since the last check.",
  action: listAssets,
  input: () => ({ desc: "updated_at", limit: 100, skip: 0 }),
  items: assetItems,
  idOf: (item) => {
    const a = item as { uid?: unknown; updated_at?: unknown };
    return `${a.uid ?? ""}:${a.updated_at ?? ""}`;
  },
  output: assetOutput,
  sample: assetSample,
  maxPages: 1,
});
