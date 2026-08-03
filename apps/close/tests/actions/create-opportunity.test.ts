import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/create-opportunity.ts";

Deno.test("create-opportunity: POSTs /opportunity/ with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "oppo_1" } }]);
  await action.execute({
    leadId: "lead_1",
    statusId: "stat_1",
    value: 50000,
    valuePeriod: "monthly",
    confidence: 90,
    userId: "user_1",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/opportunity/");
  assertEquals(JSON.parse(calls[0].body!), {
    lead_id: "lead_1",
    status_id: "stat_1",
    value: 50000,
    value_period: "monthly",
    confidence: 90,
    user_id: "user_1",
  });
});

Deno.test("create-opportunity: sends a zero value rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", value: 0 }, ctx);
  // 0 is a meaningful amount; compaction must only drop undefined.
  assertEquals(JSON.parse(calls[0].body!).value, 0);
});

Deno.test("create-opportunity: states the minor-unit convention on the value param", () => {
  const p = param(action, "value");
  assert(/minor unit|cents/i.test(p.hint!));
  assertEquals(p.validation?.integer, true);
});

Deno.test("create-opportunity: constrains value_period and confidence to documented ranges", () => {
  assertEquals(optionValues(action, "valuePeriod"), ["one_time", "monthly", "annual"]);
  const confidence = param(action, "confidence");
  assertEquals(confidence.validation?.min, 0);
  assertEquals(confidence.validation?.max, 100);
});

Deno.test("create-opportunity: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
