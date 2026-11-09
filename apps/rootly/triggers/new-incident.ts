import { pollFromListAction } from "../../_shared/poll/mod.ts";
import incidentList from "../actions/incident-list.ts";

export default pollFromListAction({
  key: "new-incident",
  title: "New Incident",
  description: "Polls the newest Rootly incidents from incident-list.",
  action: incidentList,
  input: (params) => ({ ...params, sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id),
  params: incidentList.params,
  output: [{ key: "id", type: "string", label: "Incident ID" }],
  sample: { id: "inc_123", title: "Database unavailable" },
  maxPages: 1,
});
