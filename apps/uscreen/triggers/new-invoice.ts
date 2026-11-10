import invoiceList from "../actions/invoice-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /invoices?from=<since>&date_field=created_at` — same documented `from` filter as customers
 * (https://uscreen.io/api/publisher.yml); no sort order is documented, so ids are deduped.
 */
export default sinceTrigger({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created Uscreen invoice.",
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: { id: 201, created_at: 1794182400 },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, page, ctx) {
    const out = await invoiceList.execute({ from: since, dateField: "created_at", page }, ctx) as {
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
