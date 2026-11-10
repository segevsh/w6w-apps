import { PAGE_SIZE, sinceTrigger } from "../lib/triggers.ts";
import transactionList from "../actions/transaction-list.ts";

interface Transaction {
  id?: number;
  created_at?: string;
}

// Teachable: GET /v1/transactions takes `start` ("The beginning of the time period to return results
// for (exclusive), in ISO8601 format") plus `page`/`per`, and returns a `meta.number_of_pages`; the
// list has no documented sort order, so every page of the window is read
// (https://docs.teachable.com/reference/listtransactions, verified 2026-11-09). Since-filter shape,
// brief 9.1 b. The docs do not say whether `start` compares created_at or purchased_at, hence the
// two-minute overlap and the id dedupe.
export default sinceTrigger<Transaction>({
  key: "new-transaction",
  title: "New Transaction",
  description: "The run gets each new sales transaction in the school.",
  async fetchPage(sinceMs, page, ctx) {
    const res = await transactionList.execute({
      start: new Date(sinceMs).toISOString(),
      page,
      per: PAGE_SIZE,
    }, ctx) as { transactions?: Transaction[]; meta?: { number_of_pages?: number } };
    const pages = res.meta?.number_of_pages;
    return { items: res.transactions ?? [], more: typeof pages === "number" && page < pages };
  },
  idOf: (t) => String(t.id ?? ""),
  createdAtMs: (t) => {
    const ms = Date.parse(t.created_at ?? "");
    return Number.isFinite(ms) ? ms : undefined;
  },
  output: [
    { key: "id", type: "number", label: "Transaction ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "sale_id", type: "number", label: "Sale ID" },
    { key: "pricing_plan_id", type: "number", label: "Pricing plan ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "purchased_at", type: "string", label: "Purchased at" },
    { key: "final_price", type: "number", label: "Listed price" },
    { key: "currency", type: "string", label: "Currency" },
  ],
  sample: {
    id: 101,
    user_id: 7,
    sale_id: 55,
    pricing_plan_id: 3,
    created_at: "2026-11-09T00:00:00.000Z",
    purchased_at: "2026-11-09T00:00:00.000Z",
    final_price: 4900,
    currency: "USD",
  },
});
