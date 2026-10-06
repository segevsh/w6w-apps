import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-questions.ts";

Deno.test("list-custom-questions: GET questions", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [], pagination: {} } }]);
  await action.execute!({ eventId: "1", asOwner: true, continuation: "c" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/1/questions/");
  assertEquals(url.searchParams.get("as_owner"), "true");
  assertEquals(url.searchParams.get("continuation"), "c");
});
