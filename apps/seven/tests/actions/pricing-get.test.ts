import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import pricingGet from "../../actions/pricing-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "country": "de" } as Parameters<typeof pricingGet.execute>[0];

test("pricing-get: GET /api/pricing with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "countCountries": 1, "countNetworks": 4, "countries": [] },
  }]);
  const out = await pricingGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/pricing");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), { "country": "DE", "format": "json" });
  assertEquals(calls[0].body, null);
  assertEquals(out.countCountries, 1);
});

test("pricing-get: declares type read-or-search and every required param", () => {
  const required = (pricingGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(pricingGet.type));
  assertEquals(pricingGet.type === "perform", false);
});

test("pricing-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await pricingGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
