import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quizList from "../../actions/quiz-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("quiz-list: fetches the quiz IDs for a lecture", async () => {
  const { ctx, calls } = mockCtx([{ body: { quiz_ids: [1, 2] } }]);
  const out = await quizList.execute({ courseId: 1, lectureId: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/2/quizzes");
  assertEquals((out as { quiz_ids: number[] }).quiz_ids, [1, 2]);
});
