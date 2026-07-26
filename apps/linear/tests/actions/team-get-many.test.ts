import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-get-many.ts";

Deno.test("team-get-many: sends the Teams query with a page size", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { teams: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { first: 50 });
});

Deno.test("team-get-many: explains that it yields UUIDs, not the ENG-style key", () => {
  assert(action.description?.includes("UUID"));
});
