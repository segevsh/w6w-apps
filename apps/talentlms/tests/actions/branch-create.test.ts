import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/branch-create.ts";

Deno.test("branch-create: POST createbranch and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "name": "EMEA", "usersLimit": 50 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/createbranch");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=EMEA&users_limit=50");
  assertEquals(out, { ok: "yes" });
});

Deno.test("branch-create: declares idempotent honestly", () => {
  assertEquals(action.idempotent, false);
});
