import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/text-create.ts";

/** A text item's geometry has width and rotation but no height. */
Deno.test("text-create: sends a width but never a height", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "i1" } }], { display: {} });
  await action.execute!({ boardId: "b1", content: "Title", width: 300, rotation: 0 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/texts");
  assertEquals(body.data, { content: "Title" });
  assertEquals(body.geometry, { width: 300, rotation: 0 });
  // The height is the point: a text item's geometry has no such field.
  assertEquals(body.geometry.height, undefined);
});

Deno.test("text-create: content is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1" }, ctx),
    Error,
    "`content`",
  );
  assertEquals(calls.length, 0);
});
