import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New Or Updated Contact",
  description:
    "The run gets each Ontraport contact that is created or modified (most recently modified first); an edit is a new event.",
  action: contactList,
  input: () => ({ range: 50, sort: "dlm", sortDir: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const r = item as { id?: unknown; dlm?: unknown };
    return `${String(r.id ?? "")}:${String(r.dlm ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "dlm", type: "string", label: "Date modified (Unix seconds)" },
  ],
  sample: {
    id: "101",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
    dlm: "1762700000",
  },
  maxPages: 1,
});
