import { assert, assertEquals } from "@std/assert";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-update: PUT /v1/src1/subscriptions/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscription: {} } }]);
  const out = await subscriptionUpdate.execute({
    source_id: "src1",
    oid: "o 1",
    plan_oid: "x1",
    occurred_at: 5,
    quantity: 5,
    discount: 5,
    addons: [{ oid: "a1", amount: 100, quantity: 1 }],
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/src1/subscriptions/o%201");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    plan_oid: "x1",
    occurred_at: 5,
    quantity: 5,
    discount: 5,
    addons: [{ oid: "a1", amount: 100, quantity: 1 }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert("subscription" in out);
});

Deno.test("subscription-update: omits unset optional body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await subscriptionUpdate.execute({ source_id: "src1", oid: "o 1", plan_oid: "x1" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body ?? "{}")).sort(), ["plan_oid"].sort());
});

Deno.test("subscription-update: add-ons given as a JSON string are parsed into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await subscriptionUpdate.execute({
    ...{ source_id: "src1", oid: "o 1", plan_oid: "x1" },
    addons: '[{"oid":"a","amount":1,"quantity":2}]' as unknown as unknown[],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}").addons, [{ oid: "a", amount: 1, quantity: 2 }]);
});

Deno.test("subscription-update: declares type perform and every required param", () => {
  assertEquals(subscriptionUpdate.type, "perform");
  const required = (subscriptionUpdate.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["oid", "plan_oid", "source_id"]);
});

Deno.test("subscription-update: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await subscriptionUpdate.execute({
      source_id: "src1",
      oid: "o 1",
      plan_oid: "x1",
      occurred_at: 5,
      quantity: 5,
      discount: 5,
      addons: [{ oid: "a1", amount: 100, quantity: 1 }],
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
