import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "tagging-get",
  resource: "tagging",
  title: "Get Tagging",
  description: "Fetch one tagging (a person carrying a tag) by id.",
  params: [idParam("tagId", "Tag ID"), idParam("taggingId", "Tagging ID")],
  path: (i) => `/tags/${seg(need(i, "tagId"))}/taggings/${seg(need(i, "taggingId"))}`,
  output: [
    { key: "id", type: "string", label: "Tagging id (UUID); needed to remove the tag" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "item_type", type: "string", label: "Always osdi:person" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
