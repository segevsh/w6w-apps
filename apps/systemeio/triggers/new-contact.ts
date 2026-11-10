import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";

// systeme.io pagination guide: cursor = "the ID of the last item you received"; "Specify the order of
// the data using the `order` parameter, with options for ascending (`asc`) or descending (`desc`)
// order." (https://developer.systeme.io/reference/api, verified 2026-11-09). Contact ids only grow,
// so `order=desc` is newest first.
export default pollFromListAction<Record<string, never>>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly registered contact.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "registeredAt", type: "string", label: "Registered at" },
  ],
  sample: { id: 101, email: "ada@example.com", registeredAt: "2026-11-09T00:00:00+00:00" },
  maxPages: 1,
});
