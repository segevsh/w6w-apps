import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/text-insert.ts";

Deno.test("text-insert: defaults the insertion index to 0 explicitly", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({ presentationId: "p1", objectId: "box1", text: "Hello" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ insertText: { objectId: "box1", text: "Hello", insertionIndex: 0 } }],
  });
});

Deno.test("text-insert: honours an explicit insertion index", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", objectId: "box1", text: "x", insertionIndex: 7 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].insertText.insertionIndex, 7);
});

Deno.test("text-insert: emits cellLocation when both indices are given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", objectId: "table1", text: "cell", rowIndex: 1, columnIndex: 2 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].insertText.cellLocation, {
    rowIndex: 1,
    columnIndex: 2,
  });
});

Deno.test("text-insert: a half-specified cell location is rejected locally", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", objectId: "t", text: "x", rowIndex: 0 }, ctx),
    Error,
    "rowIndex",
  );
  assertEquals(calls.length, 0);
});

Deno.test("text-insert: row/column index 0 is a real location, not a falsy skip", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", objectId: "table1", text: "x", rowIndex: 0, columnIndex: 0 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].insertText.cellLocation, {
    rowIndex: 0,
    columnIndex: 0,
  });
});
