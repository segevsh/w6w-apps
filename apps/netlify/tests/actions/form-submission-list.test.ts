import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-submission-list.ts";

Deno.test("form-submission-list: GETs /sites/{id}/submissions with pagination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "sub1" }] }]);
  const result = await action.execute!({ siteId: "site1" }, ctx);

  assertStringIncludes(calls[0].url, "https://api.netlify.com/api/v1/sites/site1/submissions?");
  assertStringIncludes(calls[0].url, "per_page=20");
  assertEquals(result, [{ id: "sub1" }]);
});

Deno.test("form-submission-list: requires siteId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "siteId");
});
