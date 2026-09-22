import { assert, assertEquals } from "@std/assert";
import scorecardCategoriesGet from "../../actions/scorecard-categories-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("scorecard-categories-get: reads the documented path for the given scorecard", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await scorecardCategoriesGet.execute({ scorecard: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/scorecards/1/categories");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("scorecard-categories-get: a UUID id is passed through uncoerced", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const id = "9e01daab-49c6-428b-9209-b5b0607acad3";

  await scorecardCategoriesGet.execute({ scorecard: id }, ctx);

  assertEquals(pathOf(calls[0].url), `/scorecards/${id}/categories`);
});

/** Both kinds come back: `visible` and `hidden`, `add` and `none`. */
Deno.test("scorecard-categories-get: the categories envelope comes back verbatim", async () => {
  const body = envelope([
    { id: "62338872", title: "Customer Service", order: 1, type: "visible", scoring_logic: "add" },
    { id: "848e0858", title: "Product Quality", order: 2, type: "hidden", scoring_logic: "none" },
  ]);
  const { ctx } = mockCtx([{ body }]);

  assertEquals(await scorecardCategoriesGet.execute({ scorecard: "1" }, ctx), body as never);
});

Deno.test("scorecard-categories-get: an empty category list is a valid answer, not an error", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  const result = await scorecardCategoriesGet.execute({ scorecard: "1" }, ctx);

  assertEquals((result as { data: unknown[] }).data, []);
});

Deno.test("scorecard-categories-get: the scorecard id is a required string param", () => {
  const scorecard = scorecardCategoriesGet.params?.find((p) => p.key === "scorecard");

  assertEquals(scorecard?.type, "string");
  assertEquals(scorecard?.required, true);
  assert(/never coerced/.test(scorecard?.hint ?? ""), scorecard?.hint);
});
