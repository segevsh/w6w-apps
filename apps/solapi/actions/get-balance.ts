import type { ActionDefinition } from "@w6w/types";
import { obj, SolapiClient } from "../lib/client.ts";

/**
 * Get Balance — Get the account balance and points in KRW, the auto-recharge settings and the low-balance alert configuration.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
type Input = Record<string, never>;

const getBalance: ActionDefinition<Input> = {
  key: "get-balance",
  type: "read",
  resource: "account",
  title: "Get Balance",
  description:
    "Get the account balance and points in KRW, the auto-recharge settings and the low-balance alert configuration.",
  params: [],
  output: [
    {
      "key": "accountId",
      "type": "string",
      "label": "Account ID",
    },
    {
      "key": "balance",
      "type": "number",
      "label": "Balance in KRW (includes deposit)",
    },
    {
      "key": "point",
      "type": "number",
      "label": "Points in KRW",
    },
    {
      "key": "minimumCash",
      "type": "number",
      "label": "Auto-recharge triggers at or below this balance",
    },
    {
      "key": "rechargeTo",
      "type": "number",
      "label": "Auto-recharge target balance",
    },
    {
      "key": "autoRecharge",
      "type": "number",
      "label": "0 disabled, 1 or more enabled",
    },
    {
      "key": "lowBalanceAlert",
      "type": "object",
      "label": "Low-balance alert settings",
    },
  ],

  async execute(_input, ctx) {
    const b = obj(await new SolapiClient(ctx).json("/cash/v1/balance"));
    return {
      accountId: b.accountId ?? null,
      balance: b.balance ?? null,
      point: b.point ?? null,
      minimumCash: b.minimumCash ?? null,
      rechargeTo: b.rechargeTo ?? null,
      autoRecharge: b.autoRecharge ?? null,
      lowBalanceAlert: b.lowBalanceAlert ?? null,
    };
  },
};

export default getBalance;
