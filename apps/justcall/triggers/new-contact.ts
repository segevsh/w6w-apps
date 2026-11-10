import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description:
    "The run gets each newly created contact, oldest first, polled from the existing `contact-list` action sorted by contact id descending (`order=desc`).",
  action,
  input: () => ({ order: "desc", page: 1, per_page: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contact_number", type: "string", label: "Phone number" },
  ],
  sample: { id: 1001, name: "Ada Lovelace", contact_number: "+14155550100" },
  maxPages: 1,
});
