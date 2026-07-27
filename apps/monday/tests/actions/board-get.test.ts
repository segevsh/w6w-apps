import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get.ts";

Deno.test("board-get: wraps the id in a list for boards(ids:)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { boards: [{ id: "b1" }] } } }]);
  await action.execute({ boardId: "b1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("boards(ids: $ids)"), true);
  assertEquals(sent.variables, { ids: ["b1"] });
});
