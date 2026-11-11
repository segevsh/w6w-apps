import { boundedList } from "../lib/triggers.ts";
import paymentLinkList from "../actions/payment-link-list.ts";

export default boundedList({
  key: "new-payment-link",
  title: "New Payment Link",
  description: "The run gets each payment link newly created on the account.",
  action: paymentLinkList as never,
  rows: "payment_links",
  paged: false,
  output: [
    { key: "id", type: "string", label: "Payment link ID" },
    { key: "short_url", type: "string", label: "Short URL" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: {
    id: "plink_1",
    short_url: "short-link-1",
    status: "created",
    created_at: 1700000000,
  },
});
