import { assert, assertEquals } from "@std/assert";
import planCreate from "../../actions/plan-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-create: POST /v1/src1/plans with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { plan: {} } }]);
  const out = await planCreate.execute({
    source_id: "src1",
    oid: "o 1",
    name: "x1",
    currency: "x1",
    amount: 5,
    interval: "month",
    interval_count: 5,
    trial_duration: 5,
    trial_duration_unit: "x1",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/src1/plans");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    oid: "o 1",
    name: "x1",
    currency: "x1",
    amount: 5,
    interval: "month",
    interval_count: 5,
    trial_duration: 5,
    trial_duration_unit: "x1",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert("plan" in out);
});

Deno.test("plan-create: omits unset optional body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await planCreate.execute({
    source_id: "src1",
    oid: "o 1",
    name: "x1",
    currency: "x1",
    amount: 5,
    interval: "month",
    interval_count: 5,
  }, ctx);
  assertEquals(
    Object.keys(JSON.parse(calls[0].body ?? "{}")).sort(),
    ["amount", "currency", "interval", "interval_count", "name", "oid"].sort(),
  );
});

Deno.test("plan-create: declares type perform and every required param", () => {
  assertEquals(planCreate.type, "perform");
  const required = (planCreate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, [
    "amount",
    "currency",
    "interval",
    "interval_count",
    "name",
    "oid",
    "source_id",
  ]);
});

Deno.test("plan-create: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await planCreate.execute({
      source_id: "src1",
      oid: "o 1",
      name: "x1",
      currency: "x1",
      amount: 5,
      interval: "month",
      interval_count: 5,
      trial_duration: 5,
      trial_duration_unit: "x1",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
