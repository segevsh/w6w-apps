import { pollFromListAction } from "../../_shared/poll/mod.ts";
import modelList from "../actions/model-list.ts";

/**
 * `GET /models?sort_by=model_created_at&sort_direction=desc` — the documented way to get the most
 * recently created public models first (https://replicate.com/docs/reference/http#models.list).
 */
export default pollFromListAction({
  key: "new-model",
  title: "New Public Model",
  description: "The run gets each public model newly created on Replicate.",
  action: modelList,
  input: () => ({
    sortBy: "model_created_at",
    sortDirection: "desc",
    limit: 100,
    returnAll: false,
  }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const m = item as { owner?: unknown; name?: unknown };
    return m.owner && m.name ? `${m.owner}/${m.name}` : "";
  },
  output: [
    { key: "owner", type: "string", label: "Owner" },
    { key: "name", type: "string", label: "Model name" },
    { key: "description", type: "string", label: "Description" },
    { key: "url", type: "string", label: "URL" },
    { key: "visibility", type: "string", label: "Visibility" },
  ],
  sample: {
    owner: "example-owner",
    name: "example-model",
    description: "An example model",
    url: "https://replicate.com/example-owner/example-model",
    visibility: "public",
  },
  maxPages: 1,
});
