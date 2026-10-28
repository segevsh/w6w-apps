import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/comment-get-many.ts";

Deno.test("comment-get-many: GETs the comments with pagination", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { comments: [], total: 0 } }]);
  await action.execute({ issueKey: "ENG-1", maxResults: 10, startAt: 20 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/issue/ENG-1/comment");
  assertEquals(q.get("maxResults"), "10");
  assertEquals(q.get("startAt"), "20");
});
