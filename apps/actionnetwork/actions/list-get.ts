import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "list-get",
  resource: "list",
  title: "Get List",
  description: "Fetch one list by its Action Network id.",
  params: [idParam("listId", "List ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/lists/${seg(need(i, "listId"))}`,
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
