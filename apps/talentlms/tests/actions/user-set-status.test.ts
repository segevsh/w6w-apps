import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-set-status.ts";

test("user-set-status: GET usersetstatus and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "userId": 7, "status": "inactive" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/usersetstatus/user_id:7,status:inactive",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

test("user-set-status: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
