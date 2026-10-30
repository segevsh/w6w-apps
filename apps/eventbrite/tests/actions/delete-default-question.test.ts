import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-default-question.ts";

test("delete-default-question: DELETE by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  await action.execute!({ eventId: "1", questionId: "email" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/canned_questions/email/");
});
