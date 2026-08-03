import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/text-delete.ts";

Deno.test("text-delete: defaults to the ALL range with no indices", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({ presentationId: "p1", objectId: "box1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ deleteText: { objectId: "box1", textRange: { type: "ALL" } } }],
  });
});

Deno.test("text-delete: FIXED_RANGE carries both indices", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", objectId: "b", rangeType: "FIXED_RANGE", startIndex: 2, endIndex: 8 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].deleteText.textRange, {
    type: "FIXED_RANGE",
    startIndex: 2,
    endIndex: 8,
  });
});

Deno.test("text-delete: FROM_START_INDEX carries only the start", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", objectId: "b", rangeType: "FROM_START_INDEX", startIndex: 4 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].deleteText.textRange, {
    type: "FROM_START_INDEX",
    startIndex: 4,
  });
});

Deno.test("text-delete: ALL with indices is rejected", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", objectId: "b", startIndex: 1 }, ctx),
    Error,
    "must not carry",
  );
  assertEquals(calls.length, 0);
});

Deno.test("text-delete: FIXED_RANGE missing endIndex is rejected", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () =>
      action.execute(
        { presentationId: "p1", objectId: "b", rangeType: "FIXED_RANGE", startIndex: 1 },
        ctx,
      ),
    Error,
    "requires both",
  );
});

Deno.test("text-delete: FROM_START_INDEX with an endIndex is rejected", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () =>
      action.execute({
        presentationId: "p1",
        objectId: "b",
        rangeType: "FROM_START_INDEX",
        startIndex: 1,
        endIndex: 3,
      }, ctx),
    Error,
    "must not carry `endIndex`",
  );
});

Deno.test("text-delete: FROM_START_INDEX without a start is rejected", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () =>
      action.execute({ presentationId: "p1", objectId: "b", rangeType: "FROM_START_INDEX" }, ctx),
    Error,
    "requires `startIndex`",
  );
});

Deno.test("text-delete: cell location needs both indices", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", objectId: "t", columnIndex: 1 }, ctx),
    Error,
    "columnIndex",
  );
});

Deno.test("text-delete: emits cellLocation alongside the range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", objectId: "t", rowIndex: 3, columnIndex: 1 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].deleteText, {
    objectId: "t",
    textRange: { type: "ALL" },
    cellLocation: { rowIndex: 3, columnIndex: 1 },
  });
});
