import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/group-remove-user.ts";

test("group-remove-user: GET removeuserfromgroup and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "userId": 7, "groupId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/removeuserfromgroup/user_id:7,group_id:2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

test("group-remove-user: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
