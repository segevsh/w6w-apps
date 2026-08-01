import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-var-set.ts";

Deno.test("env-var-set: POSTs /accounts/{id}/env with a one-entry values array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ key: "API_URL" }] }]);
  await action.execute!(
    { accountId: "acct1", key: "API_URL", value: "https://example.com", context: "production" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/accounts/acct1/env");
  assertEquals(JSON.parse(calls[0].body!), [{
    key: "API_URL",
    is_secret: false,
    values: [{ value: "https://example.com", context: "production" }],
  }]);
});

Deno.test("env-var-set: defaults context to 'all' and respects isSecret + siteId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    { accountId: "acct1", siteId: "site1", key: "SECRET_KEY", value: "s3cr3t", isSecret: true },
    ctx,
  );

  assertStringIncludes(calls[0].url, "site_id=site1");
  assertEquals(JSON.parse(calls[0].body!), [{
    key: "SECRET_KEY",
    is_secret: true,
    values: [{ value: "s3cr3t", context: "all" }],
  }]);
});

Deno.test("env-var-set: requires accountId and key", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ key: "X", value: "y" }, ctx)),
    Error,
    "accountId",
  );
  await assertRejects(
    () => Promise.resolve(action.execute!({ accountId: "acct1", value: "y" }, ctx)),
    Error,
    "key",
  );
});

Deno.test("env-var-set: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
