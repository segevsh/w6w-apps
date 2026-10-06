import { assert, assertEquals, assertRejects } from "@std/assert";
import getBalance from "../../actions/get-balance.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {};
const run = (
  ctx: Parameters<typeof getBalance.execute>[1],
  input: Record<string, unknown> = sample,
) => getBalance.execute(input as never, ctx) as Promise<unknown>;

Deno.test("get-balance: declares a read action with a description, params and output", () => {
  assertEquals(getBalance.key, "get-balance");
  assertEquals(getBalance.type, "read");
  assert((getBalance.description ?? "").length > 0);
  assert(Array.isArray(getBalance.output) && getBalance.output.length > 0);
  assertEquals(getBalance.idempotent, undefined);
});

Deno.test("get-balance: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "accountId": "AC1",
      "balance": 12000,
      "point": 300,
      "minimumCash": 5000,
      "rechargeTo": 20000,
      "autoRecharge": 1,
      "lowBalanceAlert": {
        "enabled": true,
      },
      "extra": "dropped",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "accountId": "AC1",
    "balance": 12000,
    "point": 300,
    "minimumCash": 5000,
    "rechargeTo": 20000,
    "autoRecharge": 1,
    "lowBalanceAlert": {
      "enabled": true,
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/cash/v1/balance");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-balance: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
