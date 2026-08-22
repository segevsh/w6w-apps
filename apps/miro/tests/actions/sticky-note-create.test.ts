import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sticky-note-create.ts";

Deno.test("sticky-note-create: nests content, style, position and parent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "i1" } }], { display: {} });
  await action.execute!({
    boardId: "b1",
    content: "Ship it",
    fillColor: "yellow",
    x: 10,
    y: 20,
    parentId: "f1",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/sticky_notes");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { content: "Ship it" },
    style: { fillColor: "yellow" },
    position: { x: 10, y: 20 },
    parent: { id: "f1" },
  });
});

/** Miro accepts a width OR a height on a sticky note, never both. */
Deno.test("sticky-note-create: both dimensions together is caught here, not by a 400", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () =>
      await action.execute!({ boardId: "b1", content: "x", width: 100, height: 100 }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sticky-note-create: no position means Miro places it", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: {} });
  await action.execute!({ boardId: "b1", content: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).position, undefined);
});

Deno.test("sticky-note-create: board and content are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1" }, ctx),
    Error,
    "`content`",
  );
  assertEquals(calls.length, 0);
});
