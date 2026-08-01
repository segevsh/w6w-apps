import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-create.ts";

Deno.test("deploy-create: POSTs to /sites/{id}/deploys with a branch body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "deploy1", state: "building" } },
  ]);
  const result = await action.execute!({ siteId: "site1", branch: "main" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/sites/site1/deploys");
  assertEquals(JSON.parse(calls[0].body!), { branch: "main" });
  assertEquals(result, { id: "deploy1", state: "building" });
});

Deno.test("deploy-create: sends title as a query param, not body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "deploy1" } }]);
  await action.execute!({ siteId: "site1", title: "Redeploy" }, ctx);

  assertStringIncludes(calls[0].url, "title=Redeploy");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("deploy-create: requires siteId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "siteId");
});
