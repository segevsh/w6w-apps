import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: creates the tag but attaches it to nothing", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1" } }], { display: {} });
  await action.execute!({ boardId: "b1", title: "blocked", fillColor: "red" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/tags");
  assertEquals(JSON.parse(calls[0].body!), { title: "blocked", fillColor: "red" });
});

Deno.test("tag-create: a title is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`title`");
  assertEquals(calls.length, 0);
});
