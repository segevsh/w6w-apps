import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("file-delete: DELETEs the file and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fileDelete.execute({ fileId: "f1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/files/f1");
  assertEquals(out, { success: true, fileId: "f1" });
});

test("file-delete: is declared idempotent", () => {
  assertEquals(fileDelete.idempotent, true);
});
