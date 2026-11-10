import invoiceList from "../actions/invoice-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /invoices?from=<since>&date_field=updated_at` — the documented `date_field` parameter
 * ("Available fields: created_at, updated_at") and `Invoice.updated_at`
 * (https://uscreen.io/api/publisher.yml). No sort order is documented, so ids are deduped; the
 * event identity is `id:updated_at`, so an edit is a new event. The seed floor compares the
 * invoice's `updated_at`, so nothing updated before the first check is emitted.
 */
export default sinceTrigger({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description: "The run gets each Uscreen invoice that is created or edited.",
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
    { key: "updated_at", type: "number", label: "Updated at (unix seconds)" },
  ],
  sample: { id: 201, created_at: 1794182400, updated_at: 1794182400 },
  idOf: (item) => {
    const i = item as { id?: unknown; updated_at?: unknown };
    return `${String(i.id ?? "")}:${String(i.updated_at ?? "")}`;
  },
  createdMs: (item) => stampMs((item as { updated_at?: unknown }).updated_at),
  async fetchPage(since, page, ctx) {
    const out = await invoiceList.execute({ from: since, dateField: "updated_at", page }, ctx) as {
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
