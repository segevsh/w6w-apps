import { pollFromListAction } from "../../_shared/poll/mod.ts";
import assetSearch from "../actions/asset-search.ts";

export default pollFromListAction<Record<string, unknown>>({
  key: "new-asset",
  title: "New Asset",
  description: "Emit assets newly indexed by Cloudinary.",
  action: assetSearch,
  params: assetSearch.params,
  input: (params) => ({
    ...params,
    expression: String(params.expression ?? "resource_type:image"),
    sortBy: "created_at:desc",
    returnAll: false,
    limit: 100,
  }),
  items: (result) => (result as { resources?: unknown[] }).resources ?? [],
  idOf: (item) => String((item as { asset_id: unknown }).asset_id),
  output: [{ key: "asset_id", type: "string", label: "Asset ID" }],
  sample: { asset_id: "0f8fad5b-d9cb-469f-a165-70867728950e" },
});
