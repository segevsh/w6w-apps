import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/template-list.ts";

export default pollFromListAction({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly created template.",
  action,
  input: () => ({ order_by: "created_at-desc" }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Template ID" }],
  sample: { id: "template-2" },
  maxPages: 1,
});
