import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/user-get-by-custom-field.ts";

test("user-get-by-custom-field: GET getusersbycustomfield and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "customFieldValue": "Sales" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/getusersbycustomfield/custom_field_value:Sales",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
