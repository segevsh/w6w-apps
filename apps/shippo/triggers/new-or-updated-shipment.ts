import { pollFromListAction } from "../../_shared/poll/mod.ts";
import shipmentList from "../actions/shipment-list.ts";

export default pollFromListAction({
  key: "new-or-updated-shipment",
  title: "New or Updated Shipment",
  description: "Runs when Shippo reports a shipment with new activity.",
  action: shipmentList,
  input: () => ({ results: 100, page: 1 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const shipment = item as { object_id?: unknown; updated_at?: unknown };
    return `${shipment.object_id ?? ""}:${shipment.updated_at ?? ""}`;
  },
  output: [{ key: "object_id", type: "string", label: "Shipment ID" }],
  sample: { object_id: "ship_123", updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
