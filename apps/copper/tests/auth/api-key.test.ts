import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { APPLICATION_HEADER_VALUE, authHeaders } from "../../auth/api-key.ts";

const cred = { apiKey: "copper_testkey123", userEmail: "integrations@example.com" };

/**
 * Copper's Requests page publishes the exact four-header table, and every
 * endpoint example in the docs repeats it verbatim:
 *
 *   X-PW-AccessToken: {API key}
 *   X-PW-Application: developer_api
 *   X-PW-UserEmail:   {email of token owner}
 *   Content-Type:     application/json
 *
 * Three of those four are authentication and are pinned here. Content-Type
 * belongs to the body and is tested in tests/lib/client.test.ts.
 */

Deno.test("api-key: X-PW-Application is the literal string `developer_api`", () => {
  // Not an app name, not a client id, not user-supplied. Copper documents
  // exactly one legal value and every published example sends it unchanged.
  assertEquals(APPLICATION_HEADER_VALUE, "developer_api");
  assertEquals(authHeaders(cred)["X-PW-Application"], "developer_api");
});

Deno.test("api-key: authHeaders produces exactly the three documented auth headers", () => {
  const headers = authHeaders(cred);
  assertEquals(Object.keys(headers).sort(), [
    "X-PW-AccessToken",
    "X-PW-Application",
    "X-PW-UserEmail",
  ]);
  assertEquals(headers["X-PW-AccessToken"], cred.apiKey);
  assertEquals(headers["X-PW-UserEmail"], cred.userEmail);
  // No Authorization header anywhere: Copper does not use one.
  assert(!Object.keys(headers).some((k) => k.toLowerCase() === "authorization"));
});

Deno.test("api-key: declares the token as a secret and the email as plain, required text", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey", "userEmail"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  // The email is part of the credential but is not a secret — masking it would
  // make a typo impossible to spot.
  assertEquals(fields[1].type, "string");
  assertEquals(fields[1].required, true);
});

Deno.test("api-key: the declared apiKey slot names the token header with no scheme prefix", () => {
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-PW-AccessToken");
  // Explicitly empty, not merely absent: Copper takes the raw key with no
  // `Bearer ` (or any other) scheme word.
  assertEquals(auth.apiKey?.prefix, "");
});

Deno.test("api-key: sign stamps ALL THREE X-PW headers and returns the request", async () => {
  const request = {
    url: "https://api.copper.com/developer_api/v1/people/search",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["X-PW-AccessToken"], cred.apiKey);
  assertEquals(out.headers["X-PW-Application"], "developer_api");
  assertEquals(out.headers["X-PW-UserEmail"], cred.userEmail);
});

Deno.test("api-key: sign never omits one of the three, whatever the request", async () => {
  // Guards the single most likely regression: Copper's own wording is "All
  // Copper API calls must include the following headers", and dropping any one
  // of them earns a 401. There is no endpoint that wants a subset.
  const cases: Array<{ url: string; method: "GET" | "POST" | "PUT" | "DELETE" }> = [
    { url: "https://api.copper.com/developer_api/v1/users/me", method: "GET" },
    { url: "https://api.copper.com/developer_api/v1/people/search", method: "POST" },
    { url: "https://api.copper.com/developer_api/v1/people/1", method: "PUT" },
    { url: "https://api.copper.com/developer_api/v1/people/1", method: "DELETE" },
  ];
  for (const { url, method } of cases) {
    const out = await auth.sign!(
      { request: { url, method, headers: {} }, credential: cred },
      mockCtx().ctx,
    );
    for (const name of ["X-PW-AccessToken", "X-PW-Application", "X-PW-UserEmail"]) {
      assert(out.headers[name], `${method} ${url}: missing ${name}`);
    }
  }
});

Deno.test("api-key: sign preserves headers the client already set", async () => {
  const out = await auth.sign!({
    request: {
      url: "https://api.copper.com/developer_api/v1/people",
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
    },
    credential: cred,
  }, mockCtx().ctx);
  assertEquals(out.headers["content-type"], "application/json");
  assertEquals(out.headers["accept"], "application/json");
  assertEquals(out.headers["X-PW-AccessToken"], cred.apiKey);
});

Deno.test("api-key: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /users/me with all three headers", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: 137658, name: "Demo User", email: cred.userEmail } },
  ]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/users/me");
  assertEquals(calls[0].method, "GET");
  // mockCtx lower-cases header names, as a real Headers object would.
  assertEquals(calls[0].headers["x-pw-accesstoken"], cred.apiKey);
  assertEquals(calls[0].headers["x-pw-application"], "developer_api");
  assertEquals(calls[0].headers["x-pw-useremail"], cred.userEmail);
});

Deno.test("api-key: test fails closed when the key is missing, without calling out", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails closed when the email is missing — it is half the credential", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { apiKey: cred.apiKey } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("X-PW-UserEmail"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a rejected credential on 401 and on 403", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: { message: "nope" } }]);
    const result = await auth.test({ credential: cred }, ctx);
    assertEquals(result.ok, false);
    assert(result.message?.includes(String(status)));
  }
});

Deno.test("api-key: test surfaces Copper's own message on other failures", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Unprocessable Entity" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Unprocessable Entity");
});

Deno.test("api-key: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([
    { status: 500, body: "<html>oops</html>", headers: { "content-type": "text/html" } },
  ]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Copper returned HTTP 500");
});

Deno.test("api-key: afterConnect labels the connection from /users/me and /account", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: 137658, name: "Demo User", email: cred.userEmail } },
    { status: 200, body: { id: 123, name: "Acme Inc", primary_timezone: "America/New_York" } },
  ]);
  const meta = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/users/me");
  assertEquals(calls[1].url, "https://api.copper.com/developer_api/v1/account");
  assertEquals(meta.user, { id: 137658, name: "Demo User", email: cred.userEmail });
  assertEquals(meta.account, { id: 123, name: "Acme Inc" });
});

Deno.test("api-key: afterConnect still labels the user when the account read fails", async () => {
  // The label is cosmetic and the credential already proved itself in `test`, so
  // a failed second read must not fail the connect.
  const { ctx } = mockCtx([
    { status: 200, body: { id: 1, name: "Demo User", email: cred.userEmail } },
    { status: 403, body: { message: "no" } },
  ]);
  const meta = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(meta.user, { id: 1, name: "Demo User", email: cred.userEmail });
  assertEquals(meta.account, { id: undefined, name: undefined });
});

Deno.test("api-key: afterConnect returns nothing rather than throwing when /users/me fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "boom" } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});
