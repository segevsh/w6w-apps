import { assert, assertEquals, assertRejects } from "@std/assert";
import createDonation from "../../actions/create-donation.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "reference": "D-1",
  "currency": "EUR",
  "value": 100,
  "returnUrl": "https://shop.example/r",
  "donationCampaignId": "DC1",
  "donationToken": "tk",
} as Parameters<typeof createDonation.execute>[0];

Deno.test("create-donation: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "DN1", "status": "completed" },
  }]);
  const out = await createDonation.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/donations");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "reference": "D-1",
    "amount": { "currency": "EUR", "value": 100 },
    "returnUrl": "https://shop.example/r",
    "donationCampaignId": "DC1",
    "donationToken": "tk",
  });
  assertEquals(out, { "id": "DN1", "status": "completed" });
});

Deno.test("create-donation: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "DN1", "status": "completed" },
  }], "live");
  await createDonation.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-donation: surfaces Adyen's error code, type and message", async () => {
  const { ctx } = connectionCtx([{
    status: 422,
    body: {
      status: 422,
      errorCode: "130",
      errorType: "validation",
      message: "Reference Missing",
      pspReference: "881",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(createDonation.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-donation: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "DN1", "status": "completed" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createDonation.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-donation: declares idempotency as false", () => {
  assertEquals(createDonation.idempotent, false);
});

Deno.test("create-donation: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "DN1", "status": "completed" },
  }]);
  await createDonation.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
