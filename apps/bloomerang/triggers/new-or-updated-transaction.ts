import { sinceTrigger } from "../lib/since.ts";
import listTransactions from "../actions/list-transactions.ts";

/** Bloomerang caps `take` at 50 (see the list-transactions action). */
export const PAGE_SIZE = 50;

interface Tx {
  Id?: number;
  AuditTrail?: { LastModifiedDate?: string };
}

export default sinceTrigger<Tx>({
  key: "new-or-updated-transaction",
  title: "New or Updated Transaction",
  description:
    "The run gets each transaction (donation, pledge, payment) that is created or edited, once per edit.",
  async fetchPage(sinceMs, page, ctx) {
    const res = await listTransactions.execute({
      lastModified: new Date(sinceMs).toISOString(),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }, ctx) as { Results?: Tx[] };
    const items = res.Results ?? [];
    return { items, more: items.length === PAGE_SIZE };
  },
  idOf: (t) => `${t.Id}:${t.AuditTrail?.LastModifiedDate ?? ""}`,
  output: [
    { key: "Id", type: "number", label: "Transaction ID" },
    { key: "AccountId", type: "number", label: "Constituent ID" },
    { key: "Date", type: "string", label: "Transaction date" },
    { key: "Amount", type: "number", label: "Amount" },
    { key: "AuditTrail", type: "object", label: "Created / last modified stamps" },
  ],
  sample: {
    Id: 4021,
    AccountId: 311,
    Date: "2026-11-09",
    Amount: 50,
    AuditTrail: { CreatedDate: "2026-11-09T09:00:00Z", LastModifiedDate: "2026-11-09T09:30:00Z" },
  },
});
