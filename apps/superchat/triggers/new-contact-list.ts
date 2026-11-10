import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-lists-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-contact-list",
  title: "New Contact List",
  description: "The run gets each newly created Superchat contact list.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact list ID" }],
  sample: { id: "list_1" },
  maxPages: 1,
});
