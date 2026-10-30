import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-teams.ts";

test("list-teams: GETs /teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "t1" }] } }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams");
  assertEquals(result, [{ id: "t1" }]);
});
