import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

test("user-get-many: GET users and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "pageSize": 25, "pageNumber": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/users/page_size:25,page_number:2");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
