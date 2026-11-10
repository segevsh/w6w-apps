import type { ActionDefinition } from "@w6w/types";
import assetList from "../actions/asset-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-asset",
  title: "New Asset",
  description: "The run gets each newly uploaded asset, polled newest-first through asset-list.",
  action: assetList as unknown as ActionDefinition,
  sample: { uid: "asset_001", created_at: "2026-11-09T10:00:00.000Z" },
});
