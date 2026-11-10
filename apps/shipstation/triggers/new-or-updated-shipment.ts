import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/shipment-list.ts";

interface Item {
  shipment_id: string;
  modified_at?: string;
}

/** `GET /v2/shipments?sort_by=modified_at&sort_dir=desc`; the id carries `modified_at`, so an edit is a new event. */
export default pollFromListAction({
  key: "new-or-updated-shipment",
  title: "New or Updated Shipment",
  description: "The run gets each shipment that is created or modified.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    sortBy: "modified_at",
    sortDir: "desc",
    page: 1,
    pageSize: 100,
  }),
  items: (result) => (result as { shipments?: unknown[] }).shipments ?? [],
  idOf: (item) => {
    const s = item as Item;
    return `${s.shipment_id}:${s.modified_at ?? ""}`;
  },
  params: (action.params ?? []).filter((p) => p.key === "shipmentStatus" || p.key === "tag"),
  output: [
    { key: "shipment_id", type: "string", label: "Shipment ID" },
    { key: "shipment_status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "modified_at", type: "string", label: "Modified at" },
  ],
  sample: {
    shipment_id: "se-2102034",
    shipment_status: "label_purchased",
    created_at: "2026-11-08T09:00:00.000Z",
    modified_at: "2026-11-09T10:30:00.000Z",
  },
  maxPages: 1,
});
