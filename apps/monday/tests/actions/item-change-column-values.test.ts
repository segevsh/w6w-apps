import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-change-column-values.ts";

const OK = { data: { change_multiple_column_values: { id: "i1", name: "Task" } } };

Deno.test("item-change-column-values: sends board, item and a JSON-string payload", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { boardId: "b1", itemId: "i1", columnValues: '{"text8": "hi"}' },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("change_multiple_column_values"), true);
  assertEquals(sent.variables, { boardId: "b1", itemId: "i1", columnValues: '{"text8":"hi"}' });
});

Deno.test("item-change-column-values: rejects invalid JSON before calling monday", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ boardId: "b1", itemId: "i1", columnValues: "nope" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});
