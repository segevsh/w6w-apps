import type { TriggerDefinition } from "@w6w/types";
import { checkPayouts } from "../lib/payouts.ts";

const trigger: TriggerDefinition = {
  key: "new-payout",
  title: "New Payout",
  description:
    "The run gets each new Gumroad payout (created after the trigger started; the upcoming payout is not included).",
  output: [
    { key: "id", type: "string", label: "Payout ID" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "fEGTaEpuKDsnDvf_MfecTA==",
    amount: "150.00",
    currency: "USD",
    status: "completed",
    created_at: "2026-11-05T19:38:56Z",
    processed_at: "2026-11-06T10:15:30Z",
    payment_processor: "stripe",
  },
  minIntervalMs: 900_000,
  poll({ state }, ctx) {
    return checkPayouts(state, ctx);
  },
};

export default trigger;
