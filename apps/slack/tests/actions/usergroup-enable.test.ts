import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-enable.ts";

test("usergroup-enable: POSTs /usergroups.enable with usergroup id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroup: { id: "S1" } } }]);
  await action.execute!({ userGroupId: "S1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/usergroups.enable");
  assertEquals(JSON.parse(calls[0].body!), { usergroup: "S1" });
});
