import { snapshotTrigger } from "../lib/snapshot.ts";
import quotationList from "../actions/quotation-list.ts";

/**
 * `GET /api/v2/quotations` (https://axonaut.com/api/v2/doc, 2026-11-10) sorts by `id` or `updatetime` with no direction and
 * filters by quotation date (`date_after`, YYYY-MM-DD), so each check reads every page of the quotations dated in
 * the last 31 days and diffs the ids against the previous check. A quotation backdated beyond that window is not seen.
 */
export default snapshotTrigger({
  key: "new-quotation",
  title: "New Quotation",
  description:
    "The run gets each quotation dated within the last 31 days that newly appears in Axonaut.",
  action: quotationList as never,
  input: (now) => ({ date_after: new Date(now - 31 * 86_400_000).toISOString().slice(0, 10) }),
  output: [
    { key: "id", type: "number", label: "Quotation ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "title", type: "string", label: "Title" },
    { key: "date", type: "string", label: "Quotation date" },
    { key: "status", type: "string", label: "Status" },
    { key: "company_name", type: "string", label: "Company" },
    { key: "total_amount", type: "number", label: "Total" },
  ],
  sample: {
    id: 7701,
    number: "DE-0042",
    title: "Website redesign",
    date: "2026-11-09",
    status: "pending",
    company_name: "Example Co",
    total_amount: 14400,
  },
});
