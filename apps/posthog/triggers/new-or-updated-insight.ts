import { pollFromListAction } from "../../_shared/poll/mod.ts";
import insightList from "../actions/insight-list.ts";

/**
 * `GET /api/projects/{project_id}/insights/?saved=true&basic=true&order=-last_modified_at&limit=100`:
 * `order` "Supports last_modified_at and last_viewed_at" with a leading minus for descending
 * (https://us.posthog.com/api/schema/ `insights_list`, read 2026-11-10), so page 1 holds the most
 * recently created or edited saved insights. The id carries `last_modified_at`, so an edit of an
 * old insight is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-insight",
  title: "New or Updated Insight",
  description:
    "The run gets each saved insight (trend, funnel, retention, ...) that is created or edited in the PostHog project.",
  action: insightList,
  input: () => ({ saved: true, basic: true, order: "-last_modified_at", limit: 100, offset: 0 }),
  items: (result) => {
    const results = (result as { results?: unknown })?.results;
    return Array.isArray(results) ? results : [];
  },
  idOf: (item) => {
    const i = item as { id?: unknown; last_modified_at?: unknown };
    return `${i.id ?? ""}:${i.last_modified_at ?? ""}`;
  },
  output: [
    { key: "id", type: "number", label: "Insight ID" },
    { key: "short_id", type: "string", label: "Short ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "last_modified_at", type: "string", label: "Last modified at" },
    { key: "saved", type: "boolean", label: "Saved" },
  ],
  sample: {
    id: 77,
    short_id: "aB3dE5fG",
    name: "Weekly signups",
    created_at: "2026-11-01T09:00:00.000Z",
    last_modified_at: "2026-11-10T09:00:00.000Z",
    saved: true,
  },
  maxPages: 1,
});
