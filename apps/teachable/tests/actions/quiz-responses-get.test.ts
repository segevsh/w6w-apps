import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quizResponsesGet from "../../actions/quiz-responses-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("quiz-responses-get: paths by course, lecture and quiz ID", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        course_id: 1,
        course_name: "C",
        lecture_id: 2,
        lecture_name: "L",
        graded: true,
        responses: [],
      },
    },
  ]);
  await quizResponsesGet.execute({ courseId: 1, lectureId: 2, quizId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/2/quizzes/3/responses");
});
