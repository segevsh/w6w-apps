import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-disable.ts";

test("usergroup-disable: POSTs /usergroups.disable with usergroup id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroup: { id: "S1" } } }]);
  await action.execute!({ userGroupId: "S1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/usergroups.disable");
  assertEquals(JSON.parse(calls[0].body!), { usergroup: "S1" });
});
