import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/column-get-many.ts";

Deno.test("column-get-many: fetches the board's columns", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { boards: [{ id: "b1", columns: [{ id: "status", title: "Status" }] }] } },
  }]);
  await action.execute({ boardId: "b1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("columns {"), true);
  assertEquals(sent.variables, { ids: ["b1"] });
});
