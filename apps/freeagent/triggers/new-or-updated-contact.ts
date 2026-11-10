import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each FreeAgent contact that is newly created or edited, once per edit.",
  action: contactList as unknown as ActionDefinition,
  input: () => ({ view: "all", sort: "-updated_at", page: 1, perPage: 100 }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.url ?? "") + ":" + String(i.updated_at ?? "");
  },
  output: [
    { key: "url", type: "string", label: "Contact URL (its ID)" },
    { key: "organisation_name", type: "string", label: "Organisation" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/contacts/1",
    organisation_name: "Acme Ltd",
    email: "ap@acme.test",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
