import { snapshotTrigger } from "../lib/snapshot.ts";
import orgList from "../actions/org-list.ts";

/**
 * `GET /api/v1/users/current/orgs` (https://wakatime.com/developers#orgs, 2026-11-10) lists the user's organizations: a small
 * collection with no paging, so each check reads it whole and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each organization the user newly belongs to.",
  action: orgList as never,
  input: () => ({}),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "people_count", type: "number", label: "People" },
  ],
  sample: { id: "org-sample", name: "Example Co", people_count: 12 },
});
