import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import listCurrencies from "../../actions/list-currencies.ts";
import { PUBLIC_ENDPOINTS } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("list-currencies: reads the currencies envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      currencies: [{ currency_code: "AED", unit: "DH" }, { currency_code: "BTC", unit: "B" }],
    },
  }]);
  const out = await listCurrencies.execute({}, ctx) as { currencies: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_currencies");
  assertEquals(out.currencies.length, 2);
});

/**
 * Measured 2026-08-11: this endpoint answers 200 with its full payload and no
 * credential. Declaring that is honest — and is exactly why it can never be the
 * auth probe.
 */
test("list-currencies: is declared as needing no auth, matching the measurement", () => {
  assertEquals(listCurrencies.requiresAuth, false);
  assert(PUBLIC_ENDPOINTS.includes("/get_currencies"), "the public-endpoint list lost this path");
});

test("list-currencies: a missing key yields an empty list, not undefined", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await listCurrencies.execute({}, ctx), { currencies: [] });
});
