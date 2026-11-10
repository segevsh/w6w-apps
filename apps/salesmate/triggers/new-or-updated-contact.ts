import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactSearch from "../actions/contact-search.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "Runs when Salesmate creates or updates a contact.",
  action: contactSearch,
  input: () => ({ sortBy: "contact.lastModifiedAt", sortOrder: "desc", rows: 100, from: 0 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => {
    const contact = item as { id?: unknown; lastModifiedAt?: unknown };
    return `${contact.id ?? ""}:${contact.lastModifiedAt ?? ""}`;
  },
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, lastModifiedAt: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
