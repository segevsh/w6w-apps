import { assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-get: fetches /team/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, name: "Test Team" } }]);
  const out = await teamGet.execute({ team_id: "2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/public/team/2");
  assertEquals(out, { id: 2, name: "Test Team" });
});
