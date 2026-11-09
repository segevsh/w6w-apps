import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

function idOf(item: unknown): string {
  const id = (item as { contactID?: unknown; id?: unknown }).contactID ??
    (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("Omnisend contact has no stable id");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly returned by List Contacts.",
  action: listContacts,
  input: (params) => ({ ...params, sort: "createdAt", direction: "desc", limit: 100 }),
  items: (result) => ((result as { contacts?: unknown[] }).contacts ?? []),
  idOf,
  params: listContacts.params,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact_1" },
  maxPages: 1,
});
