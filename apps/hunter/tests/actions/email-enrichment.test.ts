import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/email-enrichment.ts";

test("email-enrichment: GETs /people/find (not /email-enrichment)", async () => {
  const body = envelope({ email: "matt@hunter.io", name: { fullName: "Matthew Tharp" } });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "matt@hunter.io" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/people/find");
  assertEquals(queryOf(calls[0].url).email, "matt@hunter.io");
  assertEquals(result, body);
});

test("email-enrichment: forwards linkedinHandle", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute!({ linkedinHandle: "matttharp" }, ctx);
  assertEquals(queryOf(calls[0].url).linkedin_handle, "matttharp");
});
