import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/memberships-get.ts";

const sample = { id: 2, object: "membership", type: "recurring_plan", price: "89.00" };

Deno.test("memberships-get: reads /memberships/2 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 2 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/memberships/2");
  assertEquals(result.type, "recurring_plan");
});

Deno.test("memberships-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 2 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

/** The two vocabularies a caller has to branch on. */
Deno.test("memberships-get: declares the plan type and duration-unit vocabularies", () => {
  const fields = action.output as Array<{ key: string; label: string }>;
  const type = fields.find((f) => f.key === "type")!.label;
  for (const value of ["pack", "recurring_plan", "prepaid_plan"]) {
    assertEquals(type.includes(value), true, `${value} missing from ${type}`);
  }
  const unit = fields.find((f) => f.key === "duration_unit")!.label;
  for (const value of ["days", "weeks", "months"]) {
    assertEquals(unit.includes(value), true, `${value} missing from ${unit}`);
  }
});
