import { assert, assertEquals, assertRejects } from "@std/assert";
import orderCreate, { deriveExternalId } from "../../actions/order-create.ts";
import { API_ROOT, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const ORDER = {
  id: "PWU1IKBP333U",
  external_id: "w6w-abc123",
  status: "EXECUTED",
  payment: { subtotal: 5, total: 5, fees: 0 },
  rewards: [{ id: "CED3MVGA0K9O", order_id: "PWU1IKBP333U" }],
};

Deno.test("order-create: sends a single-reward order and returns it unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { order: ORDER } }]);
  const result = await orderCreate.execute(
    {
      fundingSourceId: "BALANCE",
      products: ["OKMHM2X2OHYV"],
      denomination: 5,
      recipientEmail: "jane@example.com",
      recipientName: "Jane Doe",
    },
    ctx,
  ) as { id: string; duplicate: boolean };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${new URL(API_ROOT).pathname}/orders`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.payment.funding_source_id, "BALANCE");
  assertEquals(body.reward.products, ["OKMHM2X2OHYV"]);
  assertEquals(body.reward.value.denomination, 5);
  assertEquals(body.reward.recipient.email, "jane@example.com");
  assert(typeof body.external_id === "string" && body.external_id.length > 0);

  assertEquals(result.id, ORDER.id);
  assertEquals(result.duplicate, false);
});

Deno.test("order-create: a 201 status reports duplicate: true", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { order: ORDER } }]);
  const result = await orderCreate.execute(
    {
      fundingSourceId: "BALANCE",
      campaignId: "IVM0I3WNJJL0",
      denomination: 10,
      externalId: "my-own-id",
    },
    ctx,
  ) as { duplicate: boolean };
  assertEquals(result.duplicate, true);
});

Deno.test("order-create: derives a stable external_id from the invocation when none is given", async () => {
  const { ctx: ctxA, calls: callsA } = mockCtxWithInvocation(
    [{ status: 200, body: { order: ORDER } }],
    "inv-same-seed",
  );
  await orderCreate.execute(
    { fundingSourceId: "BALANCE", campaignId: "IVM0I3WNJJL0", denomination: 10 },
    ctxA,
  );
  const { ctx: ctxB, calls: callsB } = mockCtxWithInvocation(
    [{ status: 200, body: { order: ORDER } }],
    "inv-same-seed",
  );
  await orderCreate.execute(
    { fundingSourceId: "BALANCE", campaignId: "IVM0I3WNJJL0", denomination: 10 },
    ctxB,
  );

  const idA = JSON.parse(callsA[0].body!).external_id;
  const idB = JSON.parse(callsB[0].body!).external_id;
  assertEquals(idA, idB, "same invocation must derive the same external_id");
});

Deno.test("order-create: requires either campaignId or products", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await orderCreate.execute({ fundingSourceId: "BALANCE", denomination: 10 }, ctx),
    Error,
    "campaignId or products",
  );
});

Deno.test("order-create: omits empty nested objects rather than sending {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { order: ORDER } }]);
  await orderCreate.execute(
    { fundingSourceId: "BALANCE", campaignId: "IVM0I3WNJJL0", denomination: 10 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reward.recipient, undefined);
  assertEquals(body.reward.delivery, undefined);
});

Deno.test("deriveExternalId: is deterministic for a given seed", async () => {
  const a = await deriveExternalId("seed-1");
  const b = await deriveExternalId("seed-1");
  const c = await deriveExternalId("seed-2");
  assertEquals(a, b);
  assert(a !== c);
  assert(a.startsWith("w6w-"));
});
