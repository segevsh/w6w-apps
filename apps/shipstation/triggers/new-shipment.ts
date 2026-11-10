import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/shipment-list.ts";

interface Item {
  id?: string | number;
  shipment_id?: string | number;
}

const newShipment = pollFromListAction({
  key: "new-shipment",
  title: "New Shipment",
  description: "The run gets each newly created shipment.",
  action,
  input: (_params) => ({ page: 1, pageSize: 100 }),
  items: (result) => {
    const r = result as { shipments?: unknown[] };
    return r.shipments ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.shipment_id ?? value.id ?? "");
  },
  params: action.params,
  output: [{ key: "shipment_id", type: "string", label: "Shipment ID" }],
  sample: { shipment_id: "shipment-a" },
  maxPages: 1,
});

export default newShipment;
