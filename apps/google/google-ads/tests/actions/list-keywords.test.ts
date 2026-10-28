import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/list-keywords.ts";

const OK = { status: 200, body: { results: [] } };

Deno.test("list-keywords: always pins the criterion type — there is no keyword resource", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM ad_group_criterion"));
  assert(q.includes("WHERE ad_group_criterion.type = KEYWORD"));
  assert(q.includes("ad_group_criterion.keyword.text"));
  assert(q.includes("ad_group_criterion.keyword.match_type"));
});

Deno.test("list-keywords: includes negative keywords by default", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  assert(!queryOf(calls[0]).includes("negative = FALSE"));
});

Deno.test("list-keywords: includeNegative:false narrows to positives", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ includeNegative: false }, ctx);
  assert(
    queryOf(calls[0]).includes(
      "ad_group_criterion.type = KEYWORD AND ad_group_criterion.negative = FALSE",
    ),
  );
});

Deno.test("list-keywords: filters by match type and status as bare enums", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ matchType: "exact", status: "enabled" }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("ad_group_criterion.keyword.match_type = EXACT"));
  assert(q.includes("ad_group_criterion.status = ENABLED"));
});

Deno.test("list-keywords: refuses a match type that is not a bare enum word", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ matchType: "'EXACT'" }, ctx), Error, "bare GAQL enum");
});

Deno.test("list-keywords: selects the output-only quality score", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  assert(queryOf(calls[0]).includes("ad_group_criterion.quality_info.quality_score"));
});

Deno.test("list-keywords: honours limit and pageToken", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ limit: 3, pageToken: "tok" }, ctx);
  assert(queryOf(calls[0]).endsWith("LIMIT 3"));
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});
