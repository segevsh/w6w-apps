import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GET users and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "by": "email", "value": "ann@example.com" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/users/email:ann@example.com");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

Deno.test("user-get: defaults to a lookup by ID", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { id: "7" } }]);
  await action.execute({ value: "7" }, ctx);
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/users/id:7");
});
