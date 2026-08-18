import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get.ts";

Deno.test("board-get: fetches one board", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "b1", name: "Roadmap" } }], {
    display: {},
  });
  const result = await action.execute!({ boardId: "b1" }, ctx);
  assertEquals(calls[0].url, "https://api.miro.com/v2/boards/b1");
  assertEquals(result, { id: "b1", name: "Roadmap" });
});

Deno.test("board-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`boardId`");
  assertEquals(calls.length, 0);
});
