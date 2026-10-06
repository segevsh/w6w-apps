import { assert, assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: PUT /v1/src1/subscriptions/o%201/cancel with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscription: {} } }]);
  const out = await subscriptionCancel.execute(
    { source_id: "src1", oid: "o 1", canceled_at: 5 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/src1/subscriptions/o%201/cancel");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { canceled_at: 5 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert("subscription" in out);
});

Deno.test("subscription-cancel: omits unset optional body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await subscriptionCancel.execute({ source_id: "src1", oid: "o 1", canceled_at: 5 }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body ?? "{}")).sort(), ["canceled_at"].sort());
});

Deno.test("subscription-cancel: declares type perform and every required param", () => {
  assertEquals(subscriptionCancel.type, "perform");
  const required = (subscriptionCancel.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["canceled_at", "oid", "source_id"]);
});

Deno.test("subscription-cancel: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await subscriptionCancel.execute({ source_id: "src1", oid: "o 1", canceled_at: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
