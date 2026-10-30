import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-custom-fields-get.ts";

test("user-custom-fields-get: GET getcustomregistrationfields and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/getcustomregistrationfields");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
