import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-move.ts";

Deno.test("item-move: sends move_item_to_group with group and item ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { move_item_to_group: { id: "i1" } } } }]);
  await action.execute({ itemId: "i1", groupId: "done" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(
    sent.query.includes("move_item_to_group(group_id: $groupId, item_id: $itemId)"),
    true,
  );
  assertEquals(sent.variables, { groupId: "done", itemId: "i1" });
});
