import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-custom-question.ts";

test("delete-custom-question: DELETE by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  await action.execute!({ eventId: "1", questionId: "9" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/questions/9/");
});
