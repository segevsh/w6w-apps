import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-custom-question.ts";

Deno.test("delete-custom-question: DELETE by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  await action.execute!({ eventId: "1", questionId: "9" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/questions/9/");
});
