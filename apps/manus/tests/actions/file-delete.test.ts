import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

test("file-delete: posts file_id to /v2/file.delete", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({}) }]);
  await fileDelete.execute({ fileId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/file.delete");
  assertEquals(JSON.parse(calls[0].body!), { file_id: "f1" });
});

test("file-delete: is idempotent", () => {
  assertEquals(fileDelete.idempotent, true);
});
