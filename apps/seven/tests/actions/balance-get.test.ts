import { assert, assertEquals } from "@std/assert";
import balanceGet from "../../actions/balance-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {} as Parameters<typeof balanceGet.execute>[0];

Deno.test("balance-get: GET /api/balance with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "amount": 12.35, "currency": "EUR" } }]);
  const out = await balanceGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/balance");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.amount, 12.35);
});

Deno.test("balance-get: declares type read-or-search and every required param", () => {
  const required = (balanceGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(balanceGet.type));
  assertEquals(balanceGet.type === "perform", false);
});

Deno.test("balance-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await balanceGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
