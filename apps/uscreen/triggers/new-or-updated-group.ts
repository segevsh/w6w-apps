import groupList from "../actions/group-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /groups?from=<since>&date_field=updated_at` — `date_field` accepts `updated_at`
 * (https://uscreen.io/api/publisher.yml, verified 2026-11-10). The event id is `id:updated_at`, so
 * an edit is a new event; a group stamped before the first check is never emitted.
 */
export default sinceTrigger({
  key: "new-or-updated-group",
  title: "New or Updated Group",
  description: "The run gets each group (team) subscription that is new or was updated.",
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing_email", type: "string", label: "Billing email" },
    { key: "updated_at", type: "number", label: "Updated at (unix seconds)" },
  ],
  sample: {
    id: 301,
    name: "Acme Team",
    billing_email: "billing@example.test",
    created_at: 1794096000,
    updated_at: 1794182400,
  },
  idOf: (item) => {
    const g = item as { id?: unknown; updated_at?: unknown };
    return `${g.id ?? ""}:${g.updated_at ?? ""}`;
  },
  createdMs: (item) => stampMs((item as { updated_at?: unknown }).updated_at),
  async fetchPage(since, page, ctx) {
    const out = await groupList.execute({ from: since, dateField: "updated_at", page }, ctx) as {
      items?: unknown[];
      hasMore?: boolean;
      nextPage?: number | null;
    };
    return {
      items: out.items ?? [],
      next: out.hasMore && typeof out.nextPage === "number" ? out.nextPage : undefined,
    };
  },
});
