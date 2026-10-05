import { assert, assertEquals, assertRejects } from "@std/assert";
import listDonationCampaigns from "../../actions/list-donation-campaigns.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "currency": "EUR", "locale": "nl-NL" } as Parameters<
  typeof listDonationCampaigns.execute
>[0];

Deno.test("list-donation-campaigns: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "donationCampaigns": [] } }]);
  const out = await listDonationCampaigns.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/donationCampaigns");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "currency": "EUR",
    "locale": "nl-NL",
  });
  assertEquals(out, { "donationCampaigns": [] });
});

Deno.test("list-donation-campaigns: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx(
    [{ status: 200, body: { "donationCampaigns": [] } }],
    "live",
  );
  await listDonationCampaigns.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("list-donation-campaigns: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(listDonationCampaigns.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("list-donation-campaigns: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "donationCampaigns": [] } }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await listDonationCampaigns.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("list-donation-campaigns: is a read-only action", () => {
  assertEquals(listDonationCampaigns.type, "read");
});

Deno.test("list-donation-campaigns: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "donationCampaigns": [] } }]);
  await listDonationCampaigns.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
