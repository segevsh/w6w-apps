import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/km-note-list.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newNote = pollFromListAction({
  key: "new-note",
  title: "New Knowledge-management Note",
  description: "The run gets each newly created knowledge-management note.",
  action,
  input: (_params) => ({ first: 50 }),
  items: (result) => {
    const r = result as { notes?: unknown[]; data?: unknown[] };
    return r.notes ?? r.data ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Knowledge-management Note ID" }],
  sample: { id: "note-a" },
  maxPages: 1,
});

export default newNote;
