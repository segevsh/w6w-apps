import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-create.ts";

const OK = { data: { create_item: { id: "i1", name: "Task" } } };

Deno.test("item-create: sends board id and item name, group left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ boardId: "b1", itemName: "Task" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("create_item"), true);
  assertEquals(sent.variables, { boardId: "b1", itemName: "Task" });
});

Deno.test("item-create: validates and re-encodes column values JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    {
      boardId: "b1",
      itemName: "x",
      groupId: "topics",
      columnValues: '{"status": {"label": "Done"}}',
    },
    ctx,
  );
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals(vars.groupId, "topics");
  // JSON scalar arrives as a canonical string, not an object.
  assertEquals(vars.columnValues, '{"status":{"label":"Done"}}');
});

Deno.test("item-create: rejects malformed column values before calling monday", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ boardId: "b1", itemName: "x", columnValues: "{bad" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});
