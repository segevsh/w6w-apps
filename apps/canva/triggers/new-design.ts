import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listDesigns from "../actions/list-designs.ts";

export default pollFromListAction<Record<string, unknown>>({
  key: "new-design",
  title: "New Design",
  description: "Emit designs newly modified in Canva.",
  action: listDesigns,
  params: listDesigns.params,
  input: (params) => ({ ...params, sortBy: "modified_descending", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Design ID" }],
  sample: { id: "DAFexample" },
});
