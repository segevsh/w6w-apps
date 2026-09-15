/**
 * How much of this account's Tremendous balance is left?
 *
 * ## Why balance, and why this endpoint
 *
 * `error-handling`'s response-code table documents `402` as "Not enough
 * funds in your account" — an order paid from `BALANCE` fails outright with
 * that code once the balance is exhausted, which makes remaining balance the
 * one number that actually predicts whether the next `order-create` call
 * will work. `GET /funding_sources/{id}` (the `get-funding-source` reference)
 * is the right read for it, and specifically NOT `list-funding-sources`,
 * whose schema is documented with an explicit caution: "In the list funding
 * sources endpoint this value is cached and may not be up to date."
 *
 * `id = "BALANCE"` is one of the reference's own documented magic keywords
 * ("retrieves the organization's balance funding source", case-insensitive),
 * so this probes the specific resource rather than guessing an ID.
 *
 * ## No fixed ceiling, so no `limit`
 *
 * Unlike Apify's plan quotas, a Tremendous balance has no ceiling to compare
 * against — only a floor (zero). `HealthQuota.limit` is therefore left unset
 * and only `remaining` (plus `unit`, the balance's own `currency_code`) is
 * reported. `state` is `down` at or below zero (the next paid order WILL
 * fail with `402`) and `ok` otherwise; there is no partial-headroom band to
 * warn on, because unlike a rate limit there is no cliff before the actual
 * floor.
 *
 * ## Why this is `unknown`, not `down`, when there is no balance source
 *
 * An organization that pays exclusively by `bank_account`, `credit_card` or
 * commercial `invoice` has no `BALANCE` funding source at all, and
 * `get-funding-source` answers `404` for a keyword with nothing behind it.
 * That says nothing about whether THOSE payment methods have headroom — it
 * only means this specific check has nothing to read — so it reports
 * `unknown` rather than `down`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const BALANCE_URL = `${API_BASE}${API_PREFIX}/funding_sources/BALANCE`;

interface FundingSourceBody {
  funding_source?: {
    method?: string;
    status?: string;
    meta?: { available_amount?: number; currency_code?: string };
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Balance headroom",
  description: "Remaining Tremendous account balance, read from GET /funding_sources/BALANCE.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["action:order-create"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(BALANCE_URL, { headers: { accept: "application/json" } });
    if (res.status === 404) {
      return {
        state: "unknown",
        message: "This account has no BALANCE funding source (paying by bank account, credit " +
          "card, or invoice instead)",
      };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Tremendous returned ${res.status} for BALANCE` };
    }

    const body = await res.json().catch(() => null) as FundingSourceBody | null;
    const meta = body?.funding_source?.meta;
    if (!meta || typeof meta.available_amount !== "number") {
      return { state: "unknown", message: "BALANCE funding source carried no available_amount" };
    }

    const remaining = meta.available_amount;
    return {
      state: remaining <= 0 ? "down" : "ok",
      message: remaining <= 0
        ? "Balance is exhausted; orders paid from BALANCE will fail with 402"
        : undefined,
      quota: [{
        id: "balance",
        remaining,
        unit: meta.currency_code ?? "USD",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
