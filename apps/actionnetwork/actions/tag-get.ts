import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "tag-get",
  resource: "tag",
  title: "Get Tag",
  description: "Fetch one tag by its Action Network id. Group API keys only.",
  params: [idParam("tagId", "Tag ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/tags/${seg(need(i, "tagId"))}`,
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
