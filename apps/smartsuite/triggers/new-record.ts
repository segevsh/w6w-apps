import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-records.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newRecord = pollFromListAction({
  key: "new-record",
  title: "New Record",
  description: "The run gets each newly created record.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    offset: 0,
    limit: 100,
    sort: [{ field: "created_at", direction: "desc" }],
  }),
  items: (result) => {
    const r = result as { items?: unknown[] };
    return r.items ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Record ID" }],
  sample: { id: "record-a" },
  maxPages: 1,
});

export default newRecord;
