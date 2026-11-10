import type { ActionDefinition } from "@w6w/types";
import { idOfRevision, sortedFeed } from "../lib/triggers.ts";
import assetList from "../actions/asset-list.ts";

/** `GET /v1/assets?sort=-updatedAt&limit=100` — the vendor OpenAPI lists `-updatedAt` in the `sort` enum (verified 2026-11-10). */
export default sortedFeed({
  key: "new-or-updated-asset",
  title: "New or Updated Asset",
  description: "The run gets each asset that was created or edited, with its new field values.",
  action: assetList as ActionDefinition,
  listKey: "assets",
  sort: "-updatedAt",
  idOf: idOfRevision,
  output: [
    { key: "id", type: "number", label: "Asset ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "locationId", type: "number", label: "Location ID" },
    { key: "serialNumber", type: "string", label: "Serial number" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 501,
    name: "Conveyor 3",
    locationId: 12,
    serialNumber: "SN-1001",
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-10T09:00:00.000Z",
  },
});
