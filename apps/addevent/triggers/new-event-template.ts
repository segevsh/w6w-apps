import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/event-template-list.ts";

export default pollFromListAction({
  key: "new-event-template",
  title: "New Event Template",
  description: "The run gets each newly created event template.",
  action,
  input: () => ({ type: "event-landing" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Template ID" }],
  sample: { id: "template-101" },
  maxPages: 1,
});
