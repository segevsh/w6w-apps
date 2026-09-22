import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-memberships-get.ts";

const sample = {
  id: 7,
  object: "customermembership",
  status: "cancelled",
  cancellation_reason: "upgraded",
};

Deno.test("customer-memberships-get: reads /customer_memberships/7 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 7 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customer_memberships/7");
  assertEquals(result.status, "cancelled");
  assertEquals(result.cancellation_reason, "upgraded");
});

Deno.test("customer-memberships-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 7 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

Deno.test("customer-memberships-get: declares the status and cancellation-reason vocabularies", () => {
  const fields = action.output as Array<{ key: string; label: string }>;
  const status = fields.find((f) => f.key === "status")!.label;
  for (const value of ["active", "hold", "completed", "cancelled"]) {
    assertEquals(status.includes(value), true, `${value} missing from ${status}`);
  }
  const reason = fields.find((f) => f.key === "cancellation_reason")!.label;
  for (const value of ["upgraded", "cancelled", "mistake", "downgraded", "no_auto_renew"]) {
    assertEquals(reason.includes(value), true, `${value} missing from ${reason}`);
  }
});
