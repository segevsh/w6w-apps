import { assert, assertEquals } from "@std/assert";
import scorecardQuestionsGet from "../../actions/scorecard-questions-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("scorecard-questions-get: reads the documented path for the given scorecard", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await scorecardQuestionsGet.execute({ scorecard: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/scorecards/1/questions");
  assertEquals(calls[0].url.split("?")[0], "https://open-api.scoreapp.com/scorecards/1/questions");
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * The vendor's own examples disagree about the id shape — UUIDs in one response
 * example, small integers in these path parameters — so an id is passed through
 * byte-for-byte rather than coerced.
 */
Deno.test("scorecard-questions-get: a UUID id is passed through uncoerced", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const id = "9e01daab-49c6-428b-9209-b5b0607acad3";

  await scorecardQuestionsGet.execute({ scorecard: id }, ctx);

  assertEquals(pathOf(calls[0].url), `/scorecards/${id}/questions`);
});

Deno.test("scorecard-questions-get: the questions envelope comes back verbatim", async () => {
  const body = envelope([{ id: "4751e041", type: "quiz", options: [], categories: [] }]);
  const { ctx } = mockCtx([{ body }]);

  assertEquals(await scorecardQuestionsGet.execute({ scorecard: "1" }, ctx), body as never);
});

Deno.test("scorecard-questions-get: the scorecard id is a required string param", () => {
  const scorecard = scorecardQuestionsGet.params?.find((p) => p.key === "scorecard");

  assertEquals(scorecard?.type, "string");
  assertEquals(scorecard?.required, true);
  assertEquals(scorecard?.validation, undefined);
  assert(/UUIDs and small integers/.test(scorecard?.hint ?? ""), scorecard?.hint);
});
