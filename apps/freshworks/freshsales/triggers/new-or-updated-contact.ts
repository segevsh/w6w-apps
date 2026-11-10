import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactGetMany from "../actions/contact-get-many.ts";
import { viewIdParam } from "../lib/params.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact in the chosen Freshsales view that is newly created or edited, once per edit.",
  action: contactGetMany as unknown as ActionDefinition,
  params: [viewIdParam("contacts")],
  input: (params) => ({
    ...(params as Record<string, unknown>),
    sort: "updated_at",
    sortType: "desc",
    page: 1,
    perPage: 100,
  }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "") + ":" + String(i.updated_at ?? "");
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 5001,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.test",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
