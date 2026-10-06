import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/group-create.ts";

Deno.test("group-create: POST creategroup and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "name": "Sales", "key": "SALES1", "maxRedemptions": 10 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/creategroup");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=Sales&key=SALES1&max_redemptions=10");
  assertEquals(out, { ok: "yes" });
});

Deno.test("group-create: declares idempotent honestly", () => {
  assertEquals(action.idempotent, false);
});
