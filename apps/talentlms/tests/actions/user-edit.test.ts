import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-edit.ts";

Deno.test("user-edit: POST edituser and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({
    "userId": 7,
    "bio": "Hi",
    "credits": 5,
    "restrictEmail": false,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/edituser");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "user_id=7&bio=Hi&credits=5&restrict_email=off");
  assertEquals(out, { ok: "yes" });
});

Deno.test("user-edit: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
