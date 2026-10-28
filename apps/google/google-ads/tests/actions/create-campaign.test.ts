import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/create-campaign.ts";

const OK = {
  status: 200,
  body: { results: [{ resourceName: "customers/1234567890/campaigns/9" }] },
};

function createOf(call: { body: string | null }): Record<string, unknown> {
  const ops = bodyOf(call).operations as Array<{ create: Record<string, unknown> }>;
  return ops[0].create;
}

const base = { name: "Q3 Search", campaignBudget: "77", advertisingChannelType: "SEARCH" };

Deno.test("create-campaign: POSTs one create operation to campaigns:mutate", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute(base, ctx);
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/campaigns:mutate",
  );
  assertEquals(calls[0].method, "POST");
});

Deno.test("create-campaign: expands a bare budget id into a relative resource name", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute(base, ctx);
  assertEquals(createOf(calls[0]).campaignBudget, "customers/1234567890/campaignBudgets/77");
});

Deno.test("create-campaign: passes a full budget resource name through", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    ...base,
    campaignBudget: "customers/9998887777/campaignBudgets/12",
  }, ctx);
  assertEquals(createOf(calls[0]).campaignBudget, "customers/9998887777/campaignBudgets/12");
});

Deno.test("create-campaign: defaults to PAUSED so it does not start spending", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute(base, ctx);
  assertEquals(createOf(calls[0]).status, "PAUSED");
  assertEquals(action.params?.find((p) => p.key === "status")?.default, "PAUSED");
});

Deno.test("create-campaign: uses v25's start_date_time / end_date_time JSON names", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    ...base,
    startDateTime: "2026-08-05 00:00:00",
    endDateTime: "2026-09-05 23:59:59",
  }, ctx);
  const create = createOf(calls[0]);
  assertEquals(create.startDateTime, "2026-08-05 00:00:00");
  assertEquals(create.endDateTime, "2026-09-05 23:59:59");
  assert(!("startDate" in create), "campaign.start_date does not exist in v25");
  assert(!("endDate" in create));
});

Deno.test("create-campaign: selects one bidding-strategy oneof arm as an empty object", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ ...base, biddingStrategy: "manualCpc" }, ctx);
  const create = createOf(calls[0]);
  assertEquals(create.manualCpc, {});
  assert(!("targetSpend" in create), "only one oneof arm may be set");
});

Deno.test("create-campaign: refuses a bidding strategy outside the known oneof arms", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ ...base, biddingStrategy: "notAStrategy" }, ctx),
    Error,
    "biddingStrategy",
  );
});

Deno.test("create-campaign: sends networkSettings only when a network flag is set", async () => {
  const { ctx, calls } = mockAdsCtx([OK, OK]);
  await action.execute(base, ctx);
  assert(!("networkSettings" in createOf(calls[0])));

  await action.execute({ ...base, targetGoogleSearch: true, targetContentNetwork: false }, ctx);
  assertEquals(createOf(calls[1]).networkSettings, {
    targetGoogleSearch: true,
    targetContentNetwork: false,
  });
});

Deno.test("create-campaign: forwards the EU political advertising self-declaration", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    ...base,
    containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
  }, ctx);
  assertEquals(
    createOf(calls[0]).containsEuPoliticalAdvertising,
    "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
  );
});

Deno.test("create-campaign: normalises the channel type to a bare enum", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ ...base, advertisingChannelType: "display" }, ctx);
  assertEquals(createOf(calls[0]).advertisingChannelType, "DISPLAY");
});

Deno.test("create-campaign: merges additionalFields last", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ ...base, additionalFields: '{"finalUrlSuffix":"a=b"}' }, ctx);
  assertEquals(createOf(calls[0]).finalUrlSuffix, "a=b");
});

Deno.test("create-campaign: is a non-idempotent perform and offers no channel-type update path", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
