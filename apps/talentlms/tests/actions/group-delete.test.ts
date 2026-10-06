import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/group-delete.ts";

Deno.test("group-delete: POST deletegroup and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "groupId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/deletegroup");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "group_id=2");
  assertEquals(out, { ok: "yes" });
});

Deno.test("group-delete: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
