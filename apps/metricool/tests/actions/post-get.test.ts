import { assertEquals } from "@std/assert";
import postGet from "../../actions/post-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("post-get: GET /v2/scheduler/posts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 5, text: "x" }) }]);
  const out = await postGet.execute({ blogId: "9", id: "5" }, ctx);
  assertEquals(out, { id: 5, text: "x" });
  assertEquals(pathOf(calls[0].url), "/api/v2/scheduler/posts/5");
  assertEquals(queryOf(calls[0].url).blogId, "9");
});
