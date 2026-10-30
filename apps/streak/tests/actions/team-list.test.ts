import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("team-list: unwraps the {results} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ key: "t1" }] } }]);
  const out = await teamList.execute({}, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me/teams");
  assertEquals(out.results, [{ key: "t1" }]);
});

test("team-list: a missing results key comes back as an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await teamList.execute({}, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});
