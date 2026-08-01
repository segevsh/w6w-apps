import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-var-list.ts";

Deno.test("env-var-list: GETs /accounts/{id}/env", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ key: "API_URL" }] }]);
  const result = await action.execute!({ accountId: "acct1" }, ctx);

  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/accounts/acct1/env");
  assertEquals(result, [{ key: "API_URL" }]);
});

Deno.test("env-var-list: filters by siteId, context and scope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    { accountId: "acct1", siteId: "site1", context: "production", scope: "builds" },
    ctx,
  );

  assertStringIncludes(calls[0].url, "site_id=site1");
  assertStringIncludes(calls[0].url, "context_name=production");
  assertStringIncludes(calls[0].url, "scope=builds");
});

Deno.test("env-var-list: requires accountId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "accountId");
});
