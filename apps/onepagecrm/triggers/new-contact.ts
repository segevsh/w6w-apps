import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

function idOf(item: unknown): string {
  const id = (item as { contact?: { id?: unknown } }).contact?.id;
  if (id === undefined || id === null) throw new Error("OnePageCRM contact has no stable id");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly returned by List Contacts.",
  action: listContacts,
  input: (params) => ({ ...params, sortBy: "created_at", order: "desc", page: 1, perPage: 100 }),
  items: (result) => ((result as { items?: unknown[] }).items ?? []),
  idOf,
  params: listContacts.params,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { contact: { id: "contact_1" } },
  maxPages: 1,
});
