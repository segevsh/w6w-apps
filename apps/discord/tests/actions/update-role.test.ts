import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-role.ts";

test("update-role: PATCHes /guilds/{gid}/roles/{rid} with supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await action.execute!(
    { guildId: "g1", roleId: "r1", name: "Renamed", color: 42 },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/roles/r1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Renamed");
  assertEquals(body.color, 42);
});
