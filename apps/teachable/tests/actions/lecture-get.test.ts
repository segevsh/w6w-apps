import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import lectureGet from "../../actions/lecture-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("lecture-get: paths by course and lecture ID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("lecture", { id: 5 }) }]);
  await lectureGet.execute({ courseId: 1, lectureId: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses/1/lectures/5");
});
