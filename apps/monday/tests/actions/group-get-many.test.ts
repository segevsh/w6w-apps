import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-get-many.ts";

Deno.test("group-get-many: fetches groups under the board", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { boards: [{ id: "b1", groups: [{ id: "g1", title: "T" }] }] } },
  }]);
  await action.execute({ boardId: "b1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("groups {"), true);
  assertEquals(sent.variables, { ids: ["b1"] });
});
