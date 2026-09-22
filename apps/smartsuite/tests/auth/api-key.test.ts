import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a custom method with accountId + apiKey fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "custom");
  const account = auth.fields?.find((f) => f.key === "accountId");
  const key = auth.fields?.find((f) => f.key === "apiKey");
  assert(account, "must declare an `accountId` field");
  assertEquals(account.type, "string");
  assertEquals(account.required, true);
  assert(key, "must declare an `apiKey` field");
  assertEquals(key.type, "secret");
  assertEquals(key.required, true);
});

Deno.test("api-key: sign stamps BOTH headers, without mutating the credential", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://app.smartsuite.com/api/v1/solutions/",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accountId: "acme", apiKey: "tok-123" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Token tok-123");
  assertEquals(out.headers["account-id"], "acme");
});

Deno.test("api-key: test probes GET /solutions/ with both headers and reads ok on 2xx", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "sol1" }] }]);
  const result = await auth.test({ credential: { accountId: "acme", apiKey: "tok-123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/solutions/");
  assertEquals(calls[0].headers["authorization"], "Token tok-123");
  assertEquals(calls[0].headers["account-id"], "acme");
});

Deno.test("api-key: test with missing accountId fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { apiKey: "tok-123" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accountId"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 400 naming the account id is classified as accountId, not apiKey", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Account ID acme is not valid" }]);
  const result = await auth.test({ credential: { accountId: "acme", apiKey: "tok-123" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Account ID"));
});

Deno.test("api-key: the missing-ACCOUNT-ID 400 is classified as accountId", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Account ID is not specified" }]);
  const result = await auth.test({ credential: { accountId: "acme", apiKey: "tok-123" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Account ID"));
  assert(!(result.message ?? "").includes("API key"));
});

Deno.test("api-key: a 401 is classified as a rejected API key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await auth.test({ credential: { accountId: "acme", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("API key"));
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: a plain-text 400 that does not mention the account id is an API-key error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Bad request" }]);
  const result = await auth.test({ credential: { accountId: "acme", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("API key"));
});

Deno.test("api-key: test never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await auth.test({
    credential: { accountId: "acme", apiKey: "super-secret-token" },
  }, ctx);
  assertEquals(result.ok, false);
  assert(!(result.message ?? "").includes("super-secret-token"));
});
