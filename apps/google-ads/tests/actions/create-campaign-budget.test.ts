import { assert, assertEquals } from "@std/assert";
import { bodyOf, mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/create-campaign-budget.ts";

const OK = {
  status: 200,
  body: { results: [{ resourceName: "customers/1234567890/campaignBudgets/77" }] },
};

Deno.test("create-campaign-budget: POSTs one create operation to campaignBudgets:mutate", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "Daily", amountMicros: 50000000 }, ctx);
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/campaignBudgets:mutate",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    operations: [{ create: { name: "Daily", amountMicros: 50000000 } }],
  });
});

Deno.test("create-campaign-budget: passes micros through untouched", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "b", amountMicros: 1 }, ctx);
  const op = (bodyOf(calls[0]).operations as Array<{ create: { amountMicros: number } }>)[0];
  // Money is integer micros — no currency conversion or scaling happens here.
  assertEquals(op.create.amountMicros, 1);
});

Deno.test("create-campaign-budget: forwards delivery method and shared flag", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    name: "Shared",
    amountMicros: 1000000,
    deliveryMethod: "STANDARD",
    explicitlyShared: true,
  }, ctx);
  const op = (bodyOf(calls[0]).operations as Array<{ create: Record<string, unknown> }>)[0];
  assertEquals(op.create.deliveryMethod, "STANDARD");
  assertEquals(op.create.explicitlyShared, true);
});

Deno.test("create-campaign-budget: keeps explicitlyShared:false rather than dropping it", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "b", amountMicros: 1, explicitlyShared: false }, ctx);
  const op = (bodyOf(calls[0]).operations as Array<{ create: Record<string, unknown> }>)[0];
  assertEquals(op.create.explicitlyShared, false);
});

Deno.test("create-campaign-budget: merges additionalFields into the create body", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    name: "b",
    amountMicros: 1,
    additionalFields: '{"period":"DAILY"}',
  }, ctx);
  const op = (bodyOf(calls[0]).operations as Array<{ create: Record<string, unknown> }>)[0];
  assertEquals(op.create.period, "DAILY");
});

Deno.test("create-campaign-budget: forwards validateOnly and partialFailure", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute(
    { name: "b", amountMicros: 1, validateOnly: true, partialFailure: true },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(body.validateOnly, true);
  assertEquals(body.partialFailure, true);
});

Deno.test("create-campaign-budget: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-campaign-budget: logs without leaking a credential", async () => {
  const { ctx, logs } = mockAdsCtx([OK]);
  await action.execute({ name: "Daily", amountMicros: 1 }, ctx);
  assertEquals(logs.length, 1);
  assert(!JSON.stringify(logs).toLowerCase().includes("token"));
});
