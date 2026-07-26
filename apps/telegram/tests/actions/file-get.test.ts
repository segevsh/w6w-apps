import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

Deno.test("file-get: GETs getFile and returns the resolved path", async () => {
  const file = { file_id: "abc", file_path: "photos/1.jpg", file_size: 100 };
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: file } }]);
  assertEquals(await action.execute({ fileId: "abc" }, ctx), file);
  assertEquals(new URL(calls[0].url).searchParams.get("file_id"), "abc");
});
