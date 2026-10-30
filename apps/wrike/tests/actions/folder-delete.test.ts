import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import folderDelete from "../../actions/folder-delete.ts";
import { mockWrikeCtx, pathOf } from "../_helpers.ts";

test("folder-delete: DELETEs /folders/{folderId}", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: {} }]);
  const out = await folderDelete.execute({ folderId: "F1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v4/folders/F1");
  assertEquals(out.status, 200);
});

test("folder-delete: is declared idempotent", () => {
  assertEquals(folderDelete.idempotent, true);
});
