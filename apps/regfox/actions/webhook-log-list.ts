import type { ActionDefinition } from "@w6w/types";
import { encodeId, type QueryValue, RegfoxClient } from "../lib/client.ts";
import {
  intParam,
  limitParam,
  requiredId,
  sortParam,
  startingAfterParam,
  strParam,
  tsParam,
} from "../lib/params.ts";

const KEYS = [
  "sort",
  "limit",
  "startingAfter",
  "greaterThanId",
  "lessThanId",
  "status",
  "dateSentAfter",
  "dateSentBefore",
];

/** `GET /v2/public/webhooks/{id}/logs` */
const webhookLogList: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-log-list",
  type: "search",
  resource: "webhook-log",
  title: "List Webhook Deliveries",
  description: "List the delivery log of a webhook, to find deliveries your endpoint missed.",
  params: [
    requiredId("webhookId", "Webhook ID"),
    strParam("status", "Delivery status"),
    sortParam,
    limitParam,
    startingAfterParam,
    intParam("greaterThanId", "Id greater than"),
    intParam("lessThanId", "Id less than"),
    tsParam("dateSentAfter", "Sent after"),
    tsParam("dateSentBefore", "Sent before"),
  ],
  output: [
    { key: "logs", type: "array", label: "Delivery log entries" },
    { key: "totalResults", type: "number", label: "Total matches" },
    { key: "hasMore", type: "boolean", label: "More results after this page" },
    { key: "startingAfter", type: "number", label: "Cursor for the next page" },
  ],
  async execute(input, ctx) {
    const query: Record<string, QueryValue> = {};
    for (const k of KEYS) query[k] = input[k] as QueryValue;
    const body = await new RegfoxClient(ctx).call<unknown[]>(
      `/webhooks/${encodeId(input.webhookId)}/logs`,
      { query },
    );
    return {
      logs: body.data ?? [],
      totalResults: body.totalResults,
      hasMore: body.hasMore ?? false,
      startingAfter: body.startingAfter,
    };
  },
};

export default webhookLogList;
