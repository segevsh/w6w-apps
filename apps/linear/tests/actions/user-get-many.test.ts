import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

Deno.test("user-get-many: sends the Users query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { users: { nodes: [] } } } }]);
  await action.execute({ first: 10 }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("query Users"), true);
  assertEquals(sent.variables, { first: 10 });
});
