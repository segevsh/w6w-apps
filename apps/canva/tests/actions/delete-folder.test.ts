import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-folder.ts";

test("delete-folder: DELETEs /rest/v1/folders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ folderId: "F1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders/F1");
  assertEquals(result, { deleted: true, folderId: "F1" });
});
