import { pollFromListAction } from "../../_shared/poll/mod.ts";
import incidentList from "../actions/incident-list.ts";

function idOf(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("PagerDuty incident has no stable id");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-incident",
  title: "New Incident",
  description: "The run gets each incident newly returned by List incidents.",
  action: incidentList,
  input: (params) => ({
    ...params,
    returnAll: false,
    limit: 100,
    sortBy: "created_at:desc",
  }),
  items: (result) => result as unknown[],
  idOf,
  params: incidentList.params,
  output: [{ key: "id", type: "string", label: "Incident ID" }],
  sample: { id: "P123" },
  maxPages: 1,
});
