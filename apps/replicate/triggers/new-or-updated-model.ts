import { pollFromListAction } from "../../_shared/poll/mod.ts";
import modelList from "../actions/model-list.ts";

/**
 * `GET /models` defaults to `sort_by=latest_version_created_at`, `sort_direction=desc` (documented
 * defaults), so a model that gets a new version moves to the top. The id carries the latest
 * version id, so a new version of a known model is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-model",
  title: "New or Updated Public Model",
  description:
    "The run gets each public model when it is created or publishes a new latest version.",
  action: modelList,
  input: () => ({
    sortBy: "latest_version_created_at",
    sortDirection: "desc",
    limit: 100,
    returnAll: false,
  }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const m = item as { owner?: unknown; name?: unknown; latest_version?: { id?: unknown } | null };
    return m.owner && m.name ? `${m.owner}/${m.name}:${m.latest_version?.id ?? ""}` : "";
  },
  output: [
    { key: "owner", type: "string", label: "Owner" },
    { key: "name", type: "string", label: "Model name" },
    { key: "latest_version", type: "object", label: "Latest version" },
  ],
  sample: {
    owner: "example-owner",
    name: "example-model",
    latest_version: { id: "version-2", created_at: "2026-11-10T09:00:00Z" },
  },
  maxPages: 1,
});
