import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/asset-list.ts";

export default pollFromListAction({
  key: "new-asset",
  title: "New Asset",
  description: "The run gets each newly created asset.",
  action,
  input: () => ({ limit: 100, returnAll: false }),
  items: (r) => (r as { assets?: unknown[] }).assets ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Asset ID" }],
  sample: { id: "asset-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
