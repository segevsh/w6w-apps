import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-custom-question.ts";

Deno.test("get-custom-question: GET by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9" } }]);
  await action.execute!({ eventId: "1", questionId: "9" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/1/questions/9/");
});
