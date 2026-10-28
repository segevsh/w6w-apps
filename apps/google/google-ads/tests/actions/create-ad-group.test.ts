import { assert, assertEquals } from "@std/assert";
import { bodyOf, mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/create-ad-group.ts";

const OK = {
  status: 200,
  body: { results: [{ resourceName: "customers/1234567890/adGroups/5" }] },
};

function createOf(call: { body: string | null }): Record<string, unknown> {
  const ops = bodyOf(call).operations as Array<{ create: Record<string, unknown> }>;
  return ops[0].create;
}

Deno.test("create-ad-group: POSTs one create operation to adGroups:mutate", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "Brand", campaignId: "42" }, ctx);
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/adGroups:mutate",
  );
  assertEquals(calls[0].method, "POST");
});

Deno.test("create-ad-group: expands a bare campaign id into a resource name", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "Brand", campaignId: "42" }, ctx);
  assertEquals(createOf(calls[0]).campaign, "customers/1234567890/campaigns/42");
});

Deno.test("create-ad-group: passes a full campaign resource name through", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    name: "Brand",
    campaignId: "customers/9998887777/campaigns/42",
  }, ctx);
  assertEquals(createOf(calls[0]).campaign, "customers/9998887777/campaigns/42");
});

Deno.test("create-ad-group: defaults to PAUSED", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "Brand", campaignId: "42" }, ctx);
  assertEquals(createOf(calls[0]).status, "PAUSED");
});

Deno.test("create-ad-group: forwards the type as a bare enum and the bid as micros", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    name: "Brand",
    campaignId: "42",
    type: "search_standard",
    cpcBidMicros: 1500000,
  }, ctx);
  const create = createOf(calls[0]);
  assertEquals(create.type, "SEARCH_STANDARD");
  assertEquals(create.cpcBidMicros, 1500000);
});

Deno.test("create-ad-group: merges additionalFields for enum members not in the select", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    name: "Brand",
    campaignId: "42",
    additionalFields: '{"type":"HOTEL_ADS"}',
  }, ctx);
  assertEquals(createOf(calls[0]).type, "HOTEL_ADS");
});

Deno.test("create-ad-group: forwards validateOnly", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ name: "Brand", campaignId: "42", validateOnly: true }, ctx);
  assertEquals(bodyOf(calls[0]).validateOnly, true);
});

Deno.test("create-ad-group: is a non-idempotent perform that logs no credential", async () => {
  const { ctx, logs } = mockAdsCtx([OK]);
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  await action.execute({ name: "Brand", campaignId: "42" }, ctx);
  assert(!JSON.stringify(logs).toLowerCase().includes("token"));
});
