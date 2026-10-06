import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/deals/{dealId}/close/` — Close a deal as won or lost. For a lost deal, `lostDealReason` is 1 Price, 2 Deal not fit, 3 No decision, 4 Lost contact, 5 Other (the account's own reasons come from GET /v1/deals/loss-reasons).
 */
interface Input {
  dealId: string;
  value: string;
  actualClosedDate?: string;
  amount?: number;
  comment?: string;
  lostDealReason?: number;
}

const dealClose: ActionDefinition<Input, unknown> = {
  key: "deal-close",
  type: "perform",
  resource: "deal",
  title: "Close Deal",
  description:
    "Close a deal as won or lost. For a lost deal, `lostDealReason` is 1 Price, 2 Deal not fit, 3 No decision, 4 Lost contact, 5 Other (the account's own reasons come from GET /v1/deals/loss-reasons).",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
    {
      key: "value",
      label: "Outcome",
      type: "select",
      required: true,
      options: [{ value: "won", label: "Won" }, { value: "lost", label: "Lost" }],
    },
    { key: "actualClosedDate", label: "Actual close date", type: "date", hint: "YYYY-MM-DD." },
    { key: "amount", label: "Final amount", type: "number" },
    { key: "comment", label: "Comment", type: "text" },
    { key: "lostDealReason", label: "Lost reason", type: "number" },
  ],
  output: [
    { key: "status", type: "string", label: "`ok` when accepted" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/${encodeURIComponent(input.dealId)}/close/`, {
      method: "POST",
      body: compact({
        value: input.value,
        actual_closed_date: input.actualClosedDate,
        amount: input.amount,
        comment: input.comment,
        lost_deal_reason: input.lostDealReason,
      }),
    });
  },
};

export default dealClose;
