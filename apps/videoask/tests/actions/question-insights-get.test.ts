import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import questionInsightsGet from "../../actions/question-insights-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("question-insights-get: GETs /questions/{questionId}/insights", async () => {
  const { ctx, calls } = mockCtx([{ body: { answers_count: 197 } }]);
  const out = await questionInsightsGet.execute({ questionId: "q1" }, ctx) as {
    answers_count: number;
  };
  assertEquals(pathOf(calls[0].url), "/questions/q1/insights");
  assertEquals(out.answers_count, 197);
});

test("question-insights-get: a plain (non-poll) question omits poll_options", async () => {
  const { ctx } = mockCtx([{ body: { answers_count: 206 } }]);
  const out = await questionInsightsGet.execute({ questionId: "q1" }, ctx) as {
    poll_options?: unknown;
  };
  assertEquals("poll_options" in out, false);
});
