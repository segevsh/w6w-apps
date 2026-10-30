import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-default-question.ts";

test("get-default-question: GET by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "email" } }]);
  await action.execute!({ eventId: "1", questionId: "email" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/canned_questions/email/");
});
