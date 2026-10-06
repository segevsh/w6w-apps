import { assertEquals } from "@std/assert";
import action from "../../actions/balance-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("balance-get: wraps the per-currency rows under `balances`", async () => {
  const rows = [{ currency: "NGN", balance: 12345 }];
  const { ctx, calls } = mockCtx([{ body: ok(rows) }]);
  assertEquals(await action.execute({}, ctx), { balances: rows });
  assertEquals(pathOf(calls[0].url), "/balance");
});

Deno.test("balance-get: a missing data array is an empty list", async () => {
  const { ctx } = mockCtx([{ body: { status: true, message: "ok" } }]);
  assertEquals(await action.execute({}, ctx), { balances: [] });
});
