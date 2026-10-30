import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-folder.ts";

test("create-folder: POSTs name and parent_folder_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { folder: { id: "F1", name: "Holiday" } } }]);
  const result = await action.execute({ name: "Holiday", parentFolderId: "root" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders");
  assertEquals(JSON.parse(calls[0].body!), { name: "Holiday", parent_folder_id: "root" });
  assertEquals(result, { id: "F1", name: "Holiday" });
});
