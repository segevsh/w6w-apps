import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

test("team-list: fetches every team with no params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "team_1" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/teams");
  assertEquals((result as { teams: unknown[] }).teams.length, 1);
});

test("team-list: defaults to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: null }]);
  assertEquals(await action.execute!({}, ctx), { teams: [] });
});
