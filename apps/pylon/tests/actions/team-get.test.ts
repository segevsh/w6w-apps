import { assertEquals } from "@std/assert";
import action from "../../actions/team-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-get: GETs /teams/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "t1", users: [] } } }]);
  const out = await action.execute!({ id: "t1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/teams/t1");
  assertEquals(out, { id: "t1", users: [] });
});
