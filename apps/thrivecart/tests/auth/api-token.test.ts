import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-token: authHeaders builds the bearer header", () => {
  assertEquals(authHeaders({ apiToken: "XXXX-XXXX" }), { authorization: "Bearer XXXX-XXXX" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("api-token: sign() stamps the Authorization header and returns the request", () => {
  const request = { headers: {} as Record<string, string>, url: "https://thrivecart.com/x" };
  const out = apiToken.sign!(
    { request, credential: { apiToken: "abc-123" } } as never,
    mockCtx().ctx,
  );
  assertEquals((out as typeof request).headers["authorization"], "Bearer abc-123");
});

Deno.test("api-token: test() fails fast on a missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test() calls GET /ping with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { account_name: "acme" } }]);
  const out = await apiToken.test({ credential: { apiToken: "abc-123-def" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/api/external${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer abc-123-def");
});

/**
 * The undocumented, but real, error shape a genuine (hyphenated) bad token
 * produces — see lib/client.ts. The probe must still report `ok: false`,
 * not crash trying to read an `error_description` that isn't there.
 */
Deno.test("api-token: test() handles the undocumented auth.invalid shape", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("auth.invalid") }]);
  const out = await apiToken.test({ credential: { apiToken: "bad-token-here" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("auth.invalid"), out.message);
});

Deno.test("api-token: test() handles the documented invalid_token shape", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("invalid_token", "The access token provided is invalid") },
  ]);
  const out = await apiToken.test({ credential: { apiToken: "abcdef" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("invalid_token"), out.message);
  assert(out.message?.includes("The access token provided is invalid"), out.message);
});

Deno.test("api-token: test() gives specific guidance for auth.missing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("auth.missing") }]);
  const out = await apiToken.test({ credential: { apiToken: "x-y" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("did not reach the request"), out.message);
});

Deno.test("api-token: afterConnect publishes only the account name", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        account_name: "acme",
        account_url: "https://acme.thrivecart.com/",
        user_username: "a@b.com",
      },
    },
  ]);
  const out = await apiToken.afterConnect!({ credential: { apiToken: "x-y" } } as never, ctx);
  assertEquals(out, { accountName: "acme" });
});

Deno.test("api-token: afterConnect fails silently on a bad response", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const out = await apiToken.afterConnect!({ credential: { apiToken: "x-y" } } as never, ctx);
  assertEquals(out, {});
});

Deno.test("api-token: the credential field is declared secret", () => {
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiToken.type, "bearer");
});
