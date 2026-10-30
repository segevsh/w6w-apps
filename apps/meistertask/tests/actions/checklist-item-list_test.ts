import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import checklistItemList from "../../actions/checklist-item-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("checklist-item-list: GET /checklists/:checklist_id/checklist_items", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 27, name: "First item" }] }]);
  const out = await checklistItemList.execute({ checklistId: 9 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklists/9/checklist_items");
  assertEquals(out, [{ id: 27, name: "First item" }]);
});
