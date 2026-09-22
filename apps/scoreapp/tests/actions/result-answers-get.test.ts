import { assert, assertEquals } from "@std/assert";
import resultAnswersGet from "../../actions/result-answers-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("result-answers-get: reads the dedicated answers path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await resultAnswersGet.execute({ scorecard: "1", result: "123" }, ctx);

  assertEquals(pathOf(calls[0].url), "/scorecards/1/results/123/answers");
  assertEquals(
    calls[0].url.split("?")[0],
    "https://open-api.scoreapp.com/scorecards/1/results/123/answers",
  );
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * This is the cheaper of the two ways to read a result's answers — the other is
 * `result-get` with `include[]=answers`, which also pulls the result row and every
 * other relationship asked for.
 */
Deno.test("result-answers-get: asks for answers and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await resultAnswersGet.execute({ scorecard: "1", result: "123" }, ctx);

  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("result-answers-get: both ids are passed through uncoerced", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await resultAnswersGet.execute(
    { scorecard: "9e01daab-49c6-428b-9209-b5b0607acad3", result: "2756c677-1820-438f" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    "/scorecards/9e01daab-49c6-428b-9209-b5b0607acad3/results/2756c677-1820-438f/answers",
  );
});

Deno.test("result-answers-get: the answers envelope comes back verbatim, score strings and all", async () => {
  const body = envelope([
    {
      id: "a0f14224-7d61-437f-8851-54bff7923720",
      answer_type: "single_choice",
      answers: [{ answer: "Yes", option: { option: "Yes" }, score: "3.00", time_spent: 4200 }],
    },
  ]);
  const { ctx } = mockCtx([{ body }]);

  assertEquals(
    await resultAnswersGet.execute({ scorecard: "1", result: "123" }, ctx),
    body as never,
  );
});

Deno.test("result-answers-get: both path ids are required string params", () => {
  const required = (resultAnswersGet.params ?? [])
    .filter((p) => p.required === true)
    .map((p) => p.key);

  assertEquals(required, ["scorecard", "result"]);
  assert(resultAnswersGet.params?.every((p) => p.type === "string"));
});
