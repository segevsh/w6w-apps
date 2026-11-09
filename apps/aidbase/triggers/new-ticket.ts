import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-list.ts";

export default pollFromListAction({
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each newly created ticket.",
  action: action as never,
  params: action.params,
  input: (params) => ({ ...params as Record<string, unknown>, limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Ticket ID" }],
  sample: { id: "ticket-101" },
  maxPages: 1,
});
