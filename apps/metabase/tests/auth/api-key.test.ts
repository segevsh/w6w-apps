import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const CRED = { siteUrl: "https://mb.example.com", apiKey: "mb_secret_key_value" };

Deno.test("api-key: sign puts the key in X-API-Key and nowhere else", () => {
  const request = { url: "https://mb.example.com/api/card", headers: {} as Record<string, string> };
  const signed = apiKey.sign!(
    { request, credential: CRED } as never,
    undefined as never,
  ) as typeof request;
  assertEquals(signed.headers["x-api-key"], "mb_secret_key_value");
  // Not in the URL, not in Authorization, not as a session token.
  assertEquals(signed.url.includes("mb_secret_key_value"), false);
  assertEquals(signed.headers["authorization"], undefined);
  assertEquals(signed.headers["x-metabase-session"], undefined);
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders(CRED), { "x-api-key": "mb_secret_key_value" });
  // A missing key produces an empty header rather than the string "undefined",
  // which would be sent to the server as if it were a credential.
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: the declared apiKey config matches what sign actually sends", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey?.in, "header");
  assertEquals(apiKey.apiKey?.name.toLowerCase(), "x-api-key");
  assertEquals(apiKey.apiKey?.prefix, "");
});

Deno.test("api-key: test rejects an incomplete credential without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    await apiKey.test({ credential: {} } as never, ctx),
    { ok: false, message: "credential missing siteUrl" },
  );
  assertEquals(
    await apiKey.test({ credential: { siteUrl: "https://x.example" } } as never, ctx),
    { ok: false, message: "credential missing apiKey" },
  );
  assertEquals(calls.length, 0, "must not call out with an incomplete credential");
});

Deno.test("api-key: test probes /api/user/current and sends the key", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, common_name: "Reporting bot" } }]);
  assertEquals(await apiKey.test({ credential: CRED } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://mb.example.com/api/user/current");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-api-key"], "mb_secret_key_value");
});

/**
 * Metabase answers a rejected key with 401 and the plain-text body
 * `Unauthenticated` — not 403, and not JSON. Verified on the wire for a
 * malformed key, an empty header and no header at all: all three are identical.
 */
Deno.test("api-key: test reports 401 as a bad credential, not an outage", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Unauthenticated",
    headers: { "content-type": "text/plain" },
  }]);
  const res = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
  assert(res.message!.includes("rejected the key"));
});

Deno.test("api-key: test tells 'wrong URL' apart from 'bad key'", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }]);
  const res = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("No Metabase at this URL"));
});

/**
 * Metabase is very commonly behind a reverse proxy. A 200 from something that is
 * not Metabase — an SSO login page, a parked domain, a captive portal — must not
 * be read as a working connection.
 */
Deno.test("api-key: a 200 that is not a user record is not a pass", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html><body>Sign in</body></html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("is this URL really Metabase"));
});

Deno.test("api-key: test rejects a site URL that cannot be a base URL", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiKey.test({ credential: { siteUrl: "   ", apiKey: "k" } } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the origin and identity, never the key", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 2,
      common_name: "Reporting bot",
      is_superuser: true,
      // Metabase returns a synthetic address for an API-key caller. It must not
      // be republished — it is not a real mailbox and would mislead a UI.
      email: "api-key-user-54b19524@api-key.invalid",
    },
  }]);
  const display = await apiKey.afterConnect!(
    {
      credential: { siteUrl: "https://mb.example.com/api/", apiKey: "mb_secret_key_value" },
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(display.siteUrl, "https://mb.example.com");
  assertEquals((display.site as { host: string }).host, "mb.example.com");
  assertEquals(
    display.user,
    { id: 2, name: "Reporting bot", isSuperuser: true },
  );
  // The synthetic address is deliberately absent.
  assertEquals(JSON.stringify(display).includes("api-key.invalid"), false);
  // And nothing anywhere in the published metadata is the credential.
  assertEquals(JSON.stringify(display).includes("mb_secret_key_value"), false);
  assertEquals(calls[0].url, "https://mb.example.com/api/user/current");
});

Deno.test("api-key: afterConnect survives an instance that will not answer whoami", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const display = await apiKey.afterConnect!(
    { credential: { siteUrl: "https://mb.example.com", apiKey: "k" } } as never,
    ctx,
  ) as Record<string, unknown>;
  // The URL is still worth recording — the client cannot address the instance
  // without it, and a transient 500 at connect time should not poison the
  // Connection permanently.
  assertEquals(display.siteUrl, "https://mb.example.com");
});

Deno.test("api-key: the connection label uses only published, redacted metadata", () => {
  const label = apiKey.connectionLabel!;
  for (const token of label.matchAll(/\{\{([^}]+)\}\}/g)) {
    assert(
      /^(user|site)\./.test(token[1].trim()),
      `label references ${token[1]}, which afterConnect does not publish`,
    );
  }
});
