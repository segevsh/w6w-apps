import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listEntriesDelete from "../../actions/list-entries-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("list-entries-delete: DELETEs /lists/{id}/list-entries/{entryId}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await listEntriesDelete.execute({ listId: 450, listEntryId: 56517 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/lists/450/list-entries/56517");
  assertEquals(out, { success: true });
});
