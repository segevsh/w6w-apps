import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-update-users.ts";

test("usergroup-update-users: POSTs /usergroups.users.update with users CSV", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroup: { id: "S1" } } }]);
  await action.execute!({ userGroupId: "S1", users: "U1,U2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/usergroups.users.update");
  assertEquals(JSON.parse(calls[0].body!), { usergroup: "S1", users: "U1,U2" });
});
