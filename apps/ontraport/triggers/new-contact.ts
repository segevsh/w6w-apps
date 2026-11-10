import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Ontraport contact (newest by Date Added first).",
  action: contactList,
  input: () => ({ range: 50, sort: "date", sortDir: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "date", type: "string", label: "Date added (Unix seconds)" },
  ],
  sample: {
    id: "101",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
    date: "1762700000",
  },
  maxPages: 1,
});
