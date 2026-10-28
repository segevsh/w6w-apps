import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

const OK = { status: 200, body: { results: [], nextPageToken: "next" } };

Deno.test("list-campaigns: builds an unfiltered FROM campaign query by default", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.startsWith("SELECT campaign.resource_name, campaign.id, campaign.name"));
  assert(q.includes("FROM campaign"));
  // Google does not exclude REMOVED campaigns by default on this resource, and
  // neither does this action.
  assert(!q.includes("WHERE"));
  assert(q.endsWith("ORDER BY campaign.id"));
});

Deno.test("list-campaigns: uses v25's start_date_time, not the removed start_date", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("campaign.start_date_time"));
  assert(q.includes("campaign.end_date_time"));
  assert(!/campaign\.start_date(?![_a-z])/.test(q), "campaign.start_date does not exist in v25");
});

Deno.test("list-campaigns: filters by status and channel type as bare enums", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ status: "enabled", advertisingChannelType: "performance_max" }, ctx);
  const q = queryOf(calls[0]);
  assert(
    q.includes(
      "WHERE campaign.status = ENABLED AND campaign.advertising_channel_type = PERFORMANCE_MAX",
    ),
  );
});

Deno.test("list-campaigns: refuses a status that is not a bare enum word", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ status: "ENABLED OR 1=1" }, ctx),
    Error,
    "bare GAQL enum",
  );
});

Deno.test("list-campaigns: honours orderBy, limit and pageToken", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ orderBy: "campaign.name", limit: 5, pageToken: "tok" }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("ORDER BY campaign.name LIMIT 5"));
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});

Deno.test("list-campaigns: returns Google's search envelope unchanged", async () => {
  const { ctx } = mockAdsCtx([OK]);
  assertEquals(await action.execute({}, ctx), { results: [], nextPageToken: "next" });
});
