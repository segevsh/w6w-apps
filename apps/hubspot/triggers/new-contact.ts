import { pollFromListAction } from "../../_shared/poll/mod.ts";
import searchContacts from "../actions/search-contacts.ts";

interface Input {
  query?: string;
}

const newContact = pollFromListAction<Input>({
  key: "new-contact",
  title: "New Contact",
  description:
    "Poll HubSpot contact search in creation-date order and emit contacts not seen in the last checks.",
  action: searchContacts,
  input: (params) => ({
    query: params.query,
    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    limit: 100,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{
    key: "query",
    label: "Search query",
    type: "string",
    hint: "Optional contact text search.",
  }],
  output: [{ key: "contact", type: "object", label: "New contact" }],
  sample: {
    id: "123",
    properties: { email: "ada@example.com", createdate: "2026-11-09T12:00:00Z" },
  },
});

export default newContact;
