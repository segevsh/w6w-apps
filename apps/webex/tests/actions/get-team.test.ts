import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-team.ts";

Deno.test("get-team: GETs /teams/{teamId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  const result = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams/t1");
  assertEquals(result, { id: "t1" });
});
