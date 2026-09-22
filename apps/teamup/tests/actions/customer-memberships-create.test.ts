import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-memberships-create.ts";

const sample = { id: 7, object: "customermembership", status: "active" };

Deno.test("customer-memberships-create: posts the documented body to /customer_memberships", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  const result = await action.execute!({
    customer: 12,
    membership: 2,
    start_date: "2026-09-22",
    payment_plan: 4,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customer_memberships");
  assertEquals(JSON.parse(calls[0].body!), {
    customer: 12,
    membership: 2,
    start_date: "2026-09-22",
    payment_plan: 4,
  });
  assertEquals(result.id, 7);
});

Deno.test("customer-memberships-create: omits unset body fields instead of sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  await action.execute!({ customer: 12, membership: 2 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["customer", "membership"]);
});

Deno.test("customer-memberships-create: is a non-idempotent sale with two required ids", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  for (const key of ["customer", "membership"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
});
