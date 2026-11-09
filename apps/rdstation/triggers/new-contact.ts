import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

function idOf(item: unknown): string {
  const id = (item as { _id?: unknown })._id;
  if (id === undefined || id === null) throw new Error("RD Station contact has no stable id");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly returned by List Contacts.",
  action: listContacts,
  input: (params) => ({ ...params, page: 1, limit: 100, order: "created_at", direction: "desc" }),
  items: (result) => ((result as { contacts?: unknown[] }).contacts ?? []),
  idOf,
  params: listContacts.params,
  output: [{ key: "_id", type: "string", label: "Contact ID" }],
  sample: { _id: "contact_1" },
  maxPages: 1,
});
