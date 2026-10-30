import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-comments.ts";

test("list-comments: GETs /v1/files/{key}/comments", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [] } }]);
  await action.execute({ fileKey: "abc123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/abc123/comments");
  assertEquals(calls[0].method, "GET");
});

test("list-comments: forwards as_md when requested", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [] } }]);
  await action.execute({ fileKey: "abc123", asMd: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("as_md"), "true");
});
