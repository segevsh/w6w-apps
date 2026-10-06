import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-default-question.ts";

Deno.test("delete-default-question: DELETE by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  await action.execute!({ eventId: "1", questionId: "email" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/canned_questions/email/");
});
