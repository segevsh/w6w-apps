import type { ActionDefinition } from "@w6w/types";
import { type QueryValue, RegfoxClient } from "../lib/client.ts";
import {
  intParam,
  limitParam,
  productParam,
  sortParam,
  startingAfterParam,
  strParam,
  tsParam,
} from "../lib/params.ts";

const KEYS = [
  "product",
  "sort",
  "limit",
  "startingAfter",
  "greaterThanId",
  "lessThanId",
  "dateExpiresAfter",
  "dateExpiresBefore",
  "redeemedGreaterThan",
  "redeemedLessThan",
  "availableGreaterThan",
  "availableLessThan",
  "code",
];

/** `GET /v2/public/coupons/global` — coupons not tied to a single form. */
const couponListGlobal: ActionDefinition<Record<string, unknown>> = {
  key: "coupon-list-global",
  type: "search",
  resource: "coupon",
  title: "List Global Coupons",
  description: "List the coupons that apply across forms for a Webconnex product.",
  params: [
    productParam,
    strParam("code", "Coupon code"),
    sortParam,
    limitParam,
    startingAfterParam,
    intParam("greaterThanId", "Id greater than"),
    intParam("lessThanId", "Id less than"),
    tsParam("dateExpiresAfter", "Expires after"),
    tsParam("dateExpiresBefore", "Expires before"),
    intParam("redeemedGreaterThan", "Redeemed more than"),
    intParam("redeemedLessThan", "Redeemed fewer than"),
    intParam("availableGreaterThan", "Available more than"),
    intParam("availableLessThan", "Available fewer than"),
  ],
  output: [
    { key: "coupons", type: "array", label: "Coupons" },
    { key: "totalResults", type: "number", label: "Total matches" },
    { key: "hasMore", type: "boolean", label: "More results after this page" },
    { key: "startingAfter", type: "number", label: "Cursor for the next page" },
  ],
  async execute(input, ctx) {
    const query: Record<string, QueryValue> = {};
    for (const k of KEYS) query[k] = input[k] as QueryValue;
    const body = await new RegfoxClient(ctx).call<unknown[]>("/coupons/global", { query });
    return {
      coupons: body.data ?? [],
      totalResults: body.totalResults,
      hasMore: body.hasMore ?? false,
      startingAfter: body.startingAfter,
    };
  },
};

export default couponListGlobal;
