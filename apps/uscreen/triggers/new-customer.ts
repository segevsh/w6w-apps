import customerList from "../actions/customer-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /customers?from=<since>&date_field=created_at` — the publisher API documents a `from`
 * created-since filter (https://uscreen.io/api/publisher.yml) but no sort order, so the trigger
 * reads the whole window page by page and dedupes by id.
 */
export default sinceTrigger({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created Uscreen customer.",
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: {
    id: 101,
    email: "customer@example.test",
    name: "Sample Customer",
    created_at: 1794182400,
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, page, ctx) {
    const out = await customerList.execute({ from: since, dateField: "created_at", page }, ctx) as {
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
