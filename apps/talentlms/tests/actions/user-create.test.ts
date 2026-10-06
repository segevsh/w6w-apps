import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

Deno.test("user-create: POST usersignup and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({
    "firstName": "Ann",
    "lastName": "Lee",
    "email": "ann@example.com",
    "login": "ann",
    "password": "pw",
    "restrictEmail": true,
    "customFields": { "1": "Sales" },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/usersignup");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    calls[0].body,
    "first_name=Ann&last_name=Lee&email=ann%40example.com&login=ann&password=pw&restrict_email=on&custom_field_1=Sales",
  );
  assertEquals(out, { ok: "yes" });
});

Deno.test("user-create: declares idempotent honestly", () => {
  assertEquals(action.idempotent, false);
});
