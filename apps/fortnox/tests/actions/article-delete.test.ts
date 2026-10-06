import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-delete.ts";

Deno.test("article-delete: DELETE /3/articles/{articleNumber} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ "articleNumber": "articleNumber-v" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/3/articles/articleNumber-v");
  assertEquals(result, { deleted: true });
});
