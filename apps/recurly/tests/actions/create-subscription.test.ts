import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-subscription.ts";

Deno.test("create-subscription: is a non-idempotent perform action", () => {
  assertEquals(action.key, "create-subscription");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  for (const key of ["planCode", "currency", "accountCode"]) {
    const p = (action.params ?? []).find((p) => p.key === key)!;
    assertEquals(p.required, true, key);
  }
});

Deno.test("create-subscription: POSTs /subscriptions with account wrapped as { code }", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "s1", uuid: "u1", state: "active" },
  }]);
  await action.execute({
    planCode: "gold",
    currency: "USD",
    accountCode: "bob",
  }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.plan_code, "gold");
  assertEquals(body.currency, "USD");
  assertEquals(body.account, { code: "bob" });
});

Deno.test("create-subscription: splits comma-separated coupon codes into an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    planCode: "gold",
    currency: "USD",
    accountCode: "bob",
    couponCodes: "EARLYBIRD, SUMMER25",
  }, connected(ctx));
  assertEquals(JSON.parse(calls[0].body ?? "{}").coupon_codes, ["EARLYBIRD", "SUMMER25"]);
});

Deno.test("create-subscription: unitAmount is passed through unchanged — major units, not cents", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    planCode: "gold",
    currency: "USD",
    accountCode: "bob",
    unitAmount: 19.99,
  }, connected(ctx));
  assertEquals(JSON.parse(calls[0].body ?? "{}").unit_amount, 19.99);
});
