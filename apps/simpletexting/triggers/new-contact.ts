import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newContact = pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action,
  input: (_params) => ({ page: 0, size: 100, direction: "DESC" }),
  items: (result) => {
    const r = result as { content?: unknown[] };
    return r.content ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { contactId: "contact-a" },
  maxPages: 1,
});

export default newContact;
