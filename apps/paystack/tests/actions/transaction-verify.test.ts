import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transaction-verify.ts";
import { errorBody, mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("transaction-verify: GETs by reference, path-escaped, and returns data", async () => {
  const data = { id: 1, status: "success", reference: "a/b?c", amount: 100 };
  const { ctx, calls } = mockCtx([{ body: ok(data) }]);
  assertEquals(await action.execute({ id: "a/b?c" }, ctx), data);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/transaction/verify/a%2Fb%3Fc");
});

Deno.test("transaction-verify: a failed payment is still a returned status, not a throw", async () => {
  const { ctx } = mockCtx([{ body: ok({ status: "failed", gateway_response: "Declined" }) }]);
  const out = await action.execute({ id: "r" }, ctx) as { status: string };
  assertEquals(out.status, "failed");
});

Deno.test("transaction-verify: requires a reference and surfaces a 404", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: errorBody("Transaction reference not found", "transaction_not_found"),
  }]);
  await assertRejects(
    async () => await action.execute({ id: "" }, ctx),
    Error,
    "Reference is required",
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    async () => await action.execute({ id: "nope" }, ctx),
    Error,
    "reference not found",
  );
});
