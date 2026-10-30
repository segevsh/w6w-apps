import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-folder.ts";

test("update-folder: PATCHes /rest/v1/folders/{id} with a new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { folder: { id: "F1", name: "Renamed" } } }]);
  const result = await action.execute({ folderId: "F1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders/F1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(result, { id: "F1", name: "Renamed" });
});
