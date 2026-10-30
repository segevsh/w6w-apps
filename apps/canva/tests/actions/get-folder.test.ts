import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-folder.ts";

test("get-folder: GETs /rest/v1/folders/{id} and unwraps the folder envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { folder: { id: "F1", name: "Holiday" } } }]);
  const result = await action.execute({ folderId: "F1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders/F1");
  assertEquals(result, { id: "F1", name: "Holiday" });
});
