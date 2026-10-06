import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "wrapper-get",
  resource: "wrapper",
  title: "Get Wrapper",
  description: "Fetch one wrapper by its Action Network id.",
  params: [idParam("wrapperId", "Wrapper ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/wrappers/${seg(need(i, "wrapperId"))}`,
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
