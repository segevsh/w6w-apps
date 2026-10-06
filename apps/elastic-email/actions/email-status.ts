import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, encodeId } from "../lib/client.ts";

type Input = Record<string, unknown>;

const flags: Array<[string, string, string]> = [
  ["showFailed", "Include failed", "Include bounced addresses."],
  ["showSent", "Include sent", "Include sent addresses."],
  ["showDelivered", "Include delivered", "Include delivered addresses."],
  ["showPending", "Include pending", "Include addresses ready to send."],
  ["showOpened", "Include opened", "Include addresses that opened."],
  ["showClicked", "Include clicked", "Include addresses that clicked."],
  ["showAbuse", "Include abuse reports", "Include addresses that reported abuse."],
  ["showUnsubscribed", "Include unsubscribed", "Include addresses that unsubscribed."],
  ["showErrors", "Include errors", "Include error messages for bounced emails."],
  ["showMessageIDs", "Include message ids", "Include all MessageIDs of the transaction."],
];

/** `GET /v4/emails/{transactionid}/status` — counts always; address lists only when asked. */
const emailStatus: ActionDefinition<Input> = {
  key: "email-status",
  type: "read",
  resource: "email",
  title: "Get Email Status",
  description:
    "Delivery status of a send, by the TransactionID a send action returned: counts of " +
    "sent, delivered, opened, clicked, bounced and unsubscribed, plus the addresses behind " +
    "each when the matching option is switched on.",
  params: [
    { key: "transactionId", label: "Transaction id", type: "string", required: true },
    ...flags.map(([key, label, hint]) => ({ key, label, type: "boolean" as const, hint })),
  ],
  output: [
    { key: "ID", type: "string", label: "Transaction id" },
    { key: "Status", type: "string", label: "Status" },
    { key: "RecipientsCount", type: "number", label: "Recipients" },
    { key: "DeliveredCount", type: "number", label: "Delivered" },
    { key: "FailedCount", type: "number", label: "Failed" },
  ],
  async execute(input, ctx) {
    const id = String(input.transactionId ?? "").trim();
    if (!id) throw new Error("Transaction id is required");
    const query: Record<string, unknown> = {};
    for (const [key] of flags) query[key] = input[key] === true ? "true" : undefined;
    return await new ElasticClient(ctx).json(`/emails/${encodeId(id)}/status`, {
      query: compact(query) as Record<string, string>,
    });
  },
};

export default emailStatus;
