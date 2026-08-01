import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-team-projects.ts";

Deno.test("get-team-projects: GETs /v1/teams/{teamId}/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Team", projects: [] } }]);
  await action.execute({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/teams/t1/projects");
  assertEquals(calls[0].method, "GET");
});
