import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/list-ad-groups.ts";

const OK = { status: 200, body: { results: [] } };

test("list-ad-groups: queries FROM ad_group with the parent campaign named", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM ad_group"));
  assert(q.includes("ad_group.cpc_bid_micros"));
  // GAQL exposes the parent resource's fields on a child's FROM without a join.
  assert(q.includes("campaign.name"));
});

test("list-ad-groups: narrows by campaign via campaign.id, not ad_group.campaign", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "42" }, ctx);
  // `ad_group.campaign` holds a resource name, so the id predicate belongs on
  // the parent resource.
  assert(queryOf(calls[0]).includes("WHERE campaign.id = 42"));
});

test("list-ad-groups: combines campaign and status filters", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "42", status: "enabled" }, ctx);
  assert(queryOf(calls[0]).includes("WHERE campaign.id = 42 AND ad_group.status = ENABLED"));
});

test("list-ad-groups: refuses a non-numeric campaign id", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ campaignId: "x" }, ctx), Error, "numeric ID");
});

test("list-ad-groups: honours limit and pageToken", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ limit: 10, pageToken: "tok" }, ctx);
  assert(queryOf(calls[0]).endsWith("LIMIT 10"));
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});
