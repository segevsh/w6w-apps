import accessList from "../actions/access-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /customers/{customer_id}/accesses?from=<since>` — `from`/`to` are documented without naming
 * the field and without a sort order, so this is the since-filter shape; an access stamped
 * (`created_at`) before the first check is never emitted
 * (https://uscreen.io/api/publisher.yml, verified 2026-11-10).
 */
export default sinceTrigger({
  key: "new-customer-access",
  title: "New Customer Access",
  description: "The run gets each product access newly granted to the chosen customer.",
  params: [{
    key: "customerId",
    label: "Customer ID or email",
    type: "string",
    required: true,
    hint: "A customer's numeric id, or their email address.",
  }],
  output: [
    { key: "id", type: "number", label: "Access ID" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "product_type", type: "string", label: "Product type" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: { id: 401, product_id: 11, product_type: "Offer", created_at: 1794182400 },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, page, ctx, params) {
    const out = await accessList.execute(
      { customerId: String(params.customerId), from: since, page },
      ctx,
    ) as { items?: unknown[]; hasMore?: boolean; nextPage?: number | null };
    return {
      items: out.items ?? [],
      next: out.hasMore && typeof out.nextPage === "number" ? out.nextPage : undefined,
    };
  },
});
