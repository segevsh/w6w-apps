import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/shipment-list.ts";

interface Item {
  shipment_id: string;
}

/**
 * `GET /v2/shipments?sort_by=created_at&sort_dir=desc` — the vendor's documented `sort_by`
 * (`modified_at`, `created_at`) and `sort_dir` (`asc`, `desc`) on List Shipments.
 */
export default pollFromListAction({
  key: "new-shipment",
  title: "New Shipment",
  description: "The run gets each newly created shipment.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, sortBy: "created_at", sortDir: "desc", page: 1, pageSize: 100 }),
  items: (result) => (result as { shipments?: unknown[] }).shipments ?? [],
  idOf: (item) => String((item as Item).shipment_id),
  params: (action.params ?? []).filter((p) => p.key === "shipmentStatus" || p.key === "tag"),
  output: [
    { key: "shipment_id", type: "string", label: "Shipment ID" },
    { key: "shipment_status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "modified_at", type: "string", label: "Modified at" },
  ],
  sample: {
    shipment_id: "se-2102034",
    shipment_status: "pending",
    created_at: "2026-11-09T09:00:00.000Z",
    modified_at: "2026-11-09T09:00:00.000Z",
  },
  maxPages: 1,
});
