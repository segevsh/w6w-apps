import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

Deno.test("user-delete: POST deleteuser and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "userId": 7, "permanent": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/deleteuser");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "user_id=7&permanent=yes");
  assertEquals(out, { ok: "yes" });
});

Deno.test("user-delete: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
