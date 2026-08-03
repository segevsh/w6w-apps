import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { authHeaders, basicHeader } from "../../auth/api-key.ts";

Deno.test("auth: declares Basic with one required secret and two optional system fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey", "systemName", "systemKey"]);
  assertEquals(fields[0].required, true);
  assertEquals(fields[0].type, "secret");
  // The system pair is optional by design — the API works without it, at half
  // the rate limit. Requiring it would lock out individual users.
  assert(!fields[1].required, "systemName must stay optional");
  assert(!fields[2].required, "systemKey must stay optional");
  // The system KEY is a secret; the system NAME is an identifier and is shown.
  assertEquals(fields[2].type, "secret");
  assertEquals(fields[1].type, "string");
});

/**
 * The trailing colon is the empty password, and it is the whole subtlety of this
 * scheme. Pinned against a hand-computed vector: base64("mykey:").
 */
Deno.test("auth: basicHeader base64-encodes `<key>:` with the trailing colon", () => {
  assertEquals(basicHeader("mykey"), `Basic ${btoa("mykey:")}`);
  assertEquals(basicHeader("mykey"), "Basic bXlrZXk6");
  // Without the colon it would be a different, wrong string.
  assert(basicHeader("mykey") !== `Basic ${btoa("mykey")}`);
});

Deno.test("auth: basicHeader handles non-ASCII key bytes without throwing", () => {
  // btoa() rejects code points above U+00FF, so the encoder must go through
  // TextEncoder first. A key is ASCII in practice; this guards the helper.
  const header = basicHeader("kéy");
  assert(header.startsWith("Basic "));
  assertEquals(header, `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode("kéy:")))}`);
});

Deno.test("auth: omits the system headers entirely when they are unset", () => {
  const headers = authHeaders({ apiKey: "k" });
  assertEquals(Object.keys(headers), ["authorization"]);
  assert(!("X-System" in headers));
  assert(!("X-System-Key" in headers));
});

Deno.test("auth: sends the system headers when both are present", () => {
  const headers = authHeaders({ apiKey: "k", systemName: "Acme", systemKey: "sk_1" });
  assertEquals(headers["X-System"], "Acme");
  assertEquals(headers["X-System-Key"], "sk_1");
  assertEquals(headers["authorization"], basicHeader("k"));
});

/** An empty string is not a valid registration and must not be sent as one. */
Deno.test("auth: treats an empty system name as absent, not as an empty header", () => {
  const headers = authHeaders({ apiKey: "k", systemName: "", systemKey: "" });
  assertEquals(Object.keys(headers), ["authorization"]);
});

Deno.test("auth: sign stamps every header onto the request", () => {
  const request = { headers: {} as Record<string, string>, url: "", method: "GET" };
  const signed = auth.sign!(
    // deno-lint-ignore no-explicit-any
    { request, credential: { apiKey: "k", systemName: "Acme", systemKey: "sk_1" } } as any,
    // deno-lint-ignore no-explicit-any
    {} as any,
    // deno-lint-ignore no-explicit-any
  ) as any;
  assertEquals(signed.headers["authorization"], "Basic azo=");
  assertEquals(signed.headers["X-System"], "Acme");
  assertEquals(signed.headers["X-System-Key"], "sk_1");
});

Deno.test("auth: sign works with only the api key", () => {
  const request = { headers: {} as Record<string, string>, url: "", method: "POST" };
  // deno-lint-ignore no-explicit-any
  const signed = auth.sign!({ request, credential: { apiKey: "k" } } as any, {} as any) as any;
  assertEquals(signed.headers["authorization"], "Basic azo=");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
});

// --- test hook -------------------------------------------------------------

Deno.test("auth.test: probes /identity, not /me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: { id: 2 } } }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/identity");
  assert(!calls[0].url.endsWith("/me"), "must never probe /me — it returns the caller's apiKey");
  assertEquals(calls[0].headers["authorization"], basicHeader("k"));
});

Deno.test("auth.test: fails closed when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0, "must not call the API without a key");
});

Deno.test("auth.test: reports a 401 as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errorMessage: "Authentication is required." } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
});

/**
 * A 403 on this API usually means the ACCOUNT is expired, not that the key is
 * wrong — "the API key remains valid... the account may be in a locked down
 * state". Telling someone to regenerate their key would send them the wrong way.
 */
Deno.test("auth.test: explains a 403 as an account/permission story, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("403"), result.message);
  assert(/expired|billing|permission/i.test(result.message ?? ""), result.message);
});

Deno.test("auth.test: surfaces an errorMessage from any other failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { errorMessage: "boom" } }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "boom");
});

Deno.test("auth.test: sends the system headers when the connection has them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test({ credential: { apiKey: "k", systemName: "Acme", systemKey: "sk" } }, ctx);
  assertEquals(calls[0].headers["x-system"], "Acme");
  assertEquals(calls[0].headers["x-system-key"], "sk");
});

// --- afterConnect ----------------------------------------------------------

Deno.test("auth.afterConnect: labels from /identity and copies no secrets", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      account: { id: 1234567, domain: "example", owner: { name: "John", email: "j@example.com" } },
      user: { id: 2, name: "Louis Tully", email: "louis@example.com" },
    },
  }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/identity");
  assertEquals(display, {
    user: { id: 2, name: "Louis Tully", email: "louis@example.com" },
    account: { id: 1234567, domain: "example" },
  });
  // Whatever the endpoint returns, nothing resembling a credential leaves here.
  assert(!JSON.stringify(display).includes("k"), "credential material reached the display data");
});

Deno.test("auth.afterConnect: returns empty rather than failing when the probe errors", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx), {});
});

Deno.test("auth: connectionLabel references only display fields afterConnect sets", () => {
  assertEquals(auth.connectionLabel, "{{user.email}} — {{account.domain}}");
});
