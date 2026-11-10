import { boundedList } from "../lib/triggers.ts";
import payoutList from "../actions/payout-list.ts";

export default boundedList({
  key: "new-payout",
  title: "New Payout",
  description: "The run gets each Airbnb payout that newly appears on the account.",
  action: payoutList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Payout ID" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "arrival_date", type: "string", label: "Arrival date" },
  ],
  sample: {
    id: "payout-1",
    amount: { amount: 12500, currency: "EUR" },
    arrival_date: "2026-11-12",
  },
});
