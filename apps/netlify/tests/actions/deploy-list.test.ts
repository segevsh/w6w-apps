import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-list.ts";

Deno.test("deploy-list: GETs /sites/{id}/deploys with pagination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "deploy1" }] }]);
  const result = await action.execute!({ siteId: "site1" }, ctx);

  assertStringIncludes(calls[0].url, "https://api.netlify.com/api/v1/sites/site1/deploys?");
  assertStringIncludes(calls[0].url, "per_page=20");
  assertEquals(result, [{ id: "deploy1" }]);
});

Deno.test("deploy-list: requires siteId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "siteId");
});
