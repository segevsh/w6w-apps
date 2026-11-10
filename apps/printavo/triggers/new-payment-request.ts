import paymentRequestList from "../actions/payment-request-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// Printavo's paymentRequests connection takes `status` (OPEN, CLOSED, ARCHIVED) and `sortDescending`
// but names no sort field (https://www.printavo.com/docs/api/v2/, verified 2026-11-10). Open requests
// are the outstanding ones, a short list, so each check reads the OPEN list (up to 5 pages of 100) and
// diffs the ids.
export default snapshotTrigger({
  key: "new-payment-request",
  title: "New Payment Request",
  description: "The run gets each payment request that newly appears among the open requests.",
  action: paymentRequestList as never,
  input: { status: "OPEN" },
  output: [
    { key: "id", type: "string", label: "Payment request ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "payment-request-sample-1", amount: 250, status: "OPEN" },
});
