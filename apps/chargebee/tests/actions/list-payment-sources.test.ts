import { assertEquals } from "@std/assert";
import { connected, mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-payment-sources.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-payment-sources: is a search action over the payment-source resource", () => {
  assertEquals(action.key, "list-payment-sources");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "payment-source");
});

Deno.test("list-payment-sources: GETs /payment_sources", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/payment_sources");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-payment-sources: subscription_id is a PLAIN param on this endpoint", async () => {
  // Its siblings here are `deepObject` operator filters; this one is not, per
  // Chargebee's own OpenAPI document. Mirroring them would send a
  // `subscription_id[is]` the endpoint does not define.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ customerId: "cust_1", subscriptionId: "sub_1" }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("subscription_id"), "sub_1");
  assertEquals(q.get("subscription_id[is]"), null);
  // ...while customer_id IS an operator filter.
  assertEquals(q.get("customer_id[is]"), "cust_1");
  assertEquals(q.get("customer_id"), null);
});

Deno.test("list-payment-sources: type and status go out as operator filters", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ type: "card", status: "valid", includeDeleted: true }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("type[is]"), "card");
  assertEquals(q.get("status[is]"), "valid");
  assertEquals(q.get("include_deleted"), "true");
});

Deno.test("list-payment-sources: type is free text, because the enum has 50-plus values", () => {
  const p = param(action, "type");
  assertEquals(p.type, "string");
  assertEquals(p.options, undefined);
});

Deno.test("list-payment-sources: offers the five documented statuses", () => {
  assertEquals(optionValues(action, "status"), [
    "valid",
    "expiring",
    "expired",
    "invalid",
    "pending_verification",
  ]);
});

Deno.test("list-payment-sources: is read-only — no create, update or delete params", () => {
  // Card data has no business crossing a workflow engine.
  const keys = (action.params ?? []).map((p) => p.key);
  for (const forbidden of ["card", "number", "cvv", "token", "tmpToken"]) {
    assertEquals(keys.includes(forbidden), false, `should not expose ${forbidden}`);
  }
});
