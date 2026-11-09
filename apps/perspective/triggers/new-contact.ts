import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

type ContactListInput = Parameters<NonNullable<typeof contactList.execute>>[0];

function idOf(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("Perspective contact has no stable id");
  return String(id);
}

export default pollFromListAction<ContactListInput>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly returned by List Contacts.",
  action: contactList as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    page: 0,
    limit: 100,
    sortField: "ps_converted_at",
    sortOrder: "-1",
  }),
  items: (result) => ((result as { data?: unknown[] }).data ?? []),
  idOf,
  params: contactList.params,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact_1" },
  maxPages: 1,
});
