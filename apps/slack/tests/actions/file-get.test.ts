import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

test("file-get: GETs /files.info with file id and unwraps `file`", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, file: { id: "F1", name: "hi" } } }]);
  const result = await action.execute!({ fileId: "F1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/files.info");
  assertEquals(url.searchParams.get("file"), "F1");
  assertEquals(result, { id: "F1", name: "hi" });
});
