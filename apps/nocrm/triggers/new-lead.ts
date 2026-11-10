import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadGetMany from "../actions/lead-get-many.ts";

function idOf(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("noCRM lead has no stable id");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each lead newly returned by List Leads.",
  action: leadGetMany,
  input: (params) => ({
    ...params,
    offset: undefined,
    order: "creation_date",
    direction: "desc",
    limit: 100,
  }),
  items: (result) => ((result as { items?: unknown[] }).items ?? []),
  idOf,
  params: leadGetMany.params,
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
