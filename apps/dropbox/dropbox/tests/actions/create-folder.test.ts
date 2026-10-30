import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-folder.ts";

test("create-folder: POSTs /files/create_folder_v2 with path", async () => {
  const body = { metadata: { id: "id:folder", name: "2026", path_display: "/invoices/2026" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ path: "/invoices/2026" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/create_folder_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.path, "/invoices/2026");
  assertEquals(payload.autorename, false);
  assertEquals(result, body);
});
