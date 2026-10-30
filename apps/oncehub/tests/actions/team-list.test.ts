import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

test("team-list: GETs /teams with the user filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ user: "USR-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/teams");
  assertEquals(url.searchParams.get("user"), "USR-1");
});
