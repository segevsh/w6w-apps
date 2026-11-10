import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-search.ts";

const trigger = pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Emits contacts in Apollo's documented newest-created-first order.",
  action,
  input: () => ({
    sort_by_field: "contact_created_at",
    sort_ascending: false,
    page: 1,
    per_page: 100,
  }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-101" },
});

export default trigger;
