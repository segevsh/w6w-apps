import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-default-questions.ts";

Deno.test("list-default-questions: GET canned_questions", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [], pagination: {} } }]);
  await action.execute!({ eventId: "e/1", includeAll: true, continuation: "c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e%2F1/canned_questions/");
  assertEquals(url.searchParams.get("include_all"), "true");
  assertEquals(url.searchParams.get("continuation"), "c1");
});
