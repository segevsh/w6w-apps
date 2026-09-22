import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-comments.ts";

Deno.test("list-comments: GETs /comments/?record={recordId}", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "cm1", message: {} }] }]);
  const result = await action.execute!({ recordId: "rec1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/comments/");
  assertEquals(url.searchParams.get("record"), "rec1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, [{ id: "cm1", message: {} }]);
});

Deno.test("list-comments: coerces a non-array body to an empty array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({ recordId: "rec1" }, ctx), []);
});
