import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/update-campaign.ts";

const OK = {
  status: 200,
  body: { results: [{ resourceName: "customers/1234567890/campaigns/9" }] },
};

function opOf(
  call: { body: string | null },
): { update: Record<string, unknown>; updateMask: string } {
  const ops = bodyOf(call).operations as Array<
    { update: Record<string, unknown>; updateMask: string }
  >;
  return ops[0];
}

Deno.test("update-campaign: derives the update mask from the fields supplied", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "9", name: "Renamed", status: "PAUSED" }, ctx);
  const op = opOf(calls[0]);
  // The mask is snake_case even though the body is camelCase — Google's
  // asymmetry, not a typo.
  assertEquals(op.updateMask, "name,status");
  assertEquals(op.update.resourceName, "customers/1234567890/campaigns/9");
  assertEquals(op.update.name, "Renamed");
  assertEquals(op.update.status, "PAUSED");
});

Deno.test("update-campaign: masks the schedule fields under their snake_case paths", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    campaignId: "9",
    startDateTime: "2026-08-05 00:00:00",
    endDateTime: "2026-09-05 23:59:59",
  }, ctx);
  assertEquals(opOf(calls[0]).updateMask, "start_date_time,end_date_time");
});

Deno.test("update-campaign: moving the budget masks campaign_budget and expands the id", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "9", campaignBudget: "77" }, ctx);
  const op = opOf(calls[0]);
  assertEquals(op.updateMask, "campaign_budget");
  assertEquals(op.update.campaignBudget, "customers/1234567890/campaignBudgets/77");
});

Deno.test("update-campaign: never puts resource_name in the mask", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "9", name: "x" }, ctx);
  assert(!opOf(calls[0]).updateMask.includes("resource_name"));
});

Deno.test("update-campaign: unions an explicit mask with the derived one, without duplicates", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    campaignId: "9",
    name: "x",
    additionalFields: '{"manualCpc":{"enhancedCpcEnabled":false}}',
    updateMask: "manual_cpc.enhanced_cpc_enabled, name",
  }, ctx);
  const op = opOf(calls[0]);
  assertEquals(op.updateMask, "name,manual_cpc.enhanced_cpc_enabled");
  assertEquals(op.update.manualCpc, { enhancedCpcEnabled: false });
});

Deno.test("update-campaign: an empty mask is refused rather than sent as a no-op", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ campaignId: "9" }, ctx), Error, "Nothing to update");
});

Deno.test("update-campaign: additionalFields alone still needs an explicit mask", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ campaignId: "9", additionalFields: '{"finalUrlSuffix":"a=b"}' }, ctx),
    Error,
    "Nothing to update",
  );
});

Deno.test("update-campaign: accepts a full resource name for the campaign", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "customers/9998887777/campaigns/9", name: "x" }, ctx);
  assertEquals(opOf(calls[0]).update.resourceName, "customers/9998887777/campaigns/9");
});

Deno.test("update-campaign: rejects a mask entry that is not a field path", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ campaignId: "9", name: "x", updateMask: "name; DROP" }, ctx),
    Error,
    "not a valid field path",
  );
});

Deno.test("update-campaign: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-campaign: offers no advertisingChannelType param — it is immutable", () => {
  assert(!action.params?.some((p) => p.key === "advertisingChannelType"));
});
