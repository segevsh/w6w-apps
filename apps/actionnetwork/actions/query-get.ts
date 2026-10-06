import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "query-get",
  resource: "query",
  title: "Get Query",
  description: "Fetch one query by its Action Network id.",
  params: [idParam("queryId", "Query ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/queries/${seg(need(i, "queryId"))}`,
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
