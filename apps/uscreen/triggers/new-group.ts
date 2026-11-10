import groupList from "../actions/group-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /groups?from=<since>&date_field=created_at` — the publisher API documents `from` plus
 * `date_field` (created_at | updated_at, default created_at) and no sort order, so this is the
 * since-filter shape (https://uscreen.io/api/publisher.yml, verified 2026-11-10).
 */
export default sinceTrigger({
  key: "new-group",
  title: "New Group",
  description: "The run gets each newly created group (team) subscription.",
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "billing_email", type: "string", label: "Billing email" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: {
    id: 301,
    name: "Acme Team",
    billing_email: "billing@example.test",
    created_at: 1794182400,
    updated_at: 1794182400,
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, page, ctx) {
    const out = await groupList.execute({ from: since, dateField: "created_at", page }, ctx) as {
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
