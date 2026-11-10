import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMonitors from "../actions/list-monitors.ts";

/**
 * `GET /api/signals/monitors` "Returns all monitors accessible by the authenticated user (owned
 * and team-shared), ordered by most recent first" (OpenAPI `listMonitors`,
 * https://app.findymail.com/docs/openapi.yaml), one unpaginated response.
 */
export default pollFromListAction({
  key: "new-monitor",
  title: "New Signal Monitor",
  description: "The run gets each newly created signal monitor.",
  action: listMonitors,
  input: (params: { ownership?: string }) => ({ ownership: params.ownership }),
  items: (result) => (result as { monitors?: unknown[] }).monitors ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  params: listMonitors.params,
  output: [
    { key: "id", type: "number", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "signal_type", type: "string", label: "Signal type" },
    { key: "status", type: "string", label: "Status" },
    { key: "keywords", type: "array", label: "Keywords" },
  ],
  sample: {
    id: 1,
    name: "Hiring monitor",
    signal_type: "keyword_mention",
    status: "active",
    keywords: ["hiring", "fundraise"],
  },
  maxPages: 1,
});
