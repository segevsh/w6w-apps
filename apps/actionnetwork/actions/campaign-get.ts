import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";

export default getAction({
  key: "campaign-get",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch one campaign by its Action Network id.",
  params: [idParam("campaignId", "Campaign ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/campaigns/${seg(need(i, "campaignId"))}`,
  output: [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],
});
