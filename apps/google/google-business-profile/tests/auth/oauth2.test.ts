import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Google authorize/token endpoints and the business.manage scope", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.revokeUrl, "https://oauth2.googleapis.com/revoke");
  assertEquals(auth.oauth2?.scopes, ["https://www.googleapis.com/auth/business.manage"]);
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test hits accounts.list with the bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "mybusinessaccountmanagement.googleapis.com");
  assertEquals(url.pathname, "/v1/accounts");
  assertEquals(url.searchParams.get("pageSize"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test reads the vendor's own error message on failure, not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: {
        code: 401,
        message: "Request is missing required authentication credential.",
        status: "UNAUTHENTICATED",
      },
    },
  }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Request is missing required authentication credential.");
});

Deno.test("oauth2: test falls back to the status code when the error body doesn't parse", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("oauth2: afterConnect extracts identity from the first account", async () => {
  const { ctx } = mockCtx([
    { body: { accounts: [{ name: "accounts/1", accountName: "Sam's Coffee" }] } },
  ]);
  const result = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result.user, { id: "accounts/1", name: "Sam's Coffee" });
});

Deno.test("oauth2: afterConnect returns {} when the account list is empty", async () => {
  const { ctx } = mockCtx([{ body: { accounts: [] } }]);
  const result = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: afterConnect returns {} on a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result, {});
});
