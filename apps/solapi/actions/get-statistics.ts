import type { ActionDefinition } from "@w6w/types";
import { asItems, obj, SolapiClient } from "../lib/client.ts";

/**
 * Get Sending Statistics — Get sending statistics for a date range: spend, refunds, totals and successes and failures by message type, with monthly and daily breakdowns.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  startDate?: string;
  endDate?: string;
}

const getStatistics: ActionDefinition<Input> = {
  key: "get-statistics",
  type: "read",
  resource: "account",
  title: "Get Sending Statistics",
  description:
    "Get sending statistics for a date range: spend, refunds, totals and successes and failures by message type, with monthly and daily breakdowns.",
  params: [
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
      "hint": "ISO 8601. Empty: from the oldest data.",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
      "hint": "ISO 8601. Empty: until now.",
    },
  ],
  output: [
    {
      "key": "balance",
      "type": "number",
      "label": "Balance spent in the range (KRW)",
    },
    {
      "key": "point",
      "type": "number",
      "label": "Points spent in the range",
    },
    {
      "key": "refund",
      "type": "object",
      "label": "Refunded balance and points",
    },
    {
      "key": "total",
      "type": "object",
      "label": "Messages sent, by type",
    },
    {
      "key": "successed",
      "type": "object",
      "label": "Successful messages, by type",
    },
    {
      "key": "failed",
      "type": "object",
      "label": "Failed messages, by type",
    },
    {
      "key": "monthPeriod",
      "type": "array",
      "label": "Per-month statistics",
    },
    {
      "key": "dayPeriod",
      "type": "array",
      "label": "Per-day statistics",
    },
  ],

  async execute(input, ctx) {
    const b = obj(
      await new SolapiClient(ctx).json("/messages/v4/statistics", {
        query: { startDate: input.startDate, endDate: input.endDate },
      }),
    );
    return {
      balance: b.balance ?? null,
      point: b.point ?? null,
      refund: b.refund ?? null,
      total: b.total ?? null,
      successed: b.successed ?? null,
      failed: b.failed ?? null,
      monthPeriod: asItems(b.monthPeriod),
      dayPeriod: asItems(b.dayPeriod),
    };
  },
};

export default getStatistics;
