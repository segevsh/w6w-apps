import { boundedList } from "../lib/triggers.ts";
import disputeList from "../actions/dispute-list.ts";

export default boundedList({
  key: "new-dispute",
  title: "New Dispute",
  description: "The run gets each dispute newly raised against a payment.",
  action: disputeList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Dispute ID" },
    { key: "payment_id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "disp_1", payment_id: "pay_1", status: "open", created_at: 1700000000 },
});
