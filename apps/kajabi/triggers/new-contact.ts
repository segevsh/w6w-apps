import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description:
    "The run gets each newly created contact, oldest first, polled from the existing `contact-list` action sorted by `created_at` descending (`sort=-created_at`).",
  action,
  input: () => ({ sort: "-created_at", pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "attributes", type: "object", label: "Contact attributes (name, email, created_at)" },
  ],
  sample: {
    id: "123",
    type: "contacts",
    attributes: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      created_at: "2026-11-09T10:00:00Z",
    },
  },
  maxPages: 1,
});
