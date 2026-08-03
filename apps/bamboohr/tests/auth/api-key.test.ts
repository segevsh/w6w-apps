import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import apiKey, { basicHeader, PASSWORD } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("auth: declares the shape a Basic API key connection needs", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "basic");
  assertEquals(typeof apiKey.sign, "function");
  assertEquals(typeof apiKey.test, "function");

  const keys = (apiKey.fields ?? []).map((f) => f.key);
  // Both are required: without the subdomain there is no host to call at all.
  assertEquals(keys, ["subdomain", "apiKey"]);
  for (const f of apiKey.fields ?? []) assertEquals(f.required, true, `${f.key} must be required`);

  const secret = (apiKey.fields ?? []).find((f) => f.key === "apiKey")!;
  assertEquals(secret.type, "secret", "the API key must be masked and encrypted");

  const sub = (apiKey.fields ?? []).find((f) => f.key === "subdomain")!;
  assertEquals(sub.type, "string", "the company domain is not a secret — it is in every URL");
});

/**
 * The wire format, pinned against BambooHR's own documented curl sample:
 *
 *   curl -i -u "{API Key}:x" "https://{companyDomain}.bamboohr.com/api/v1/employees/directory"
 *
 * `-u a:b` is exactly `Authorization: Basic base64("a:b")`, so the payload for a
 * key `abc123` is `base64("abc123:x")`.
 *
 * Computed here with `@std/encoding` rather than hard-coded, so the test proves
 * the STRING BEING ENCODED is right instead of merely reproducing whatever the
 * implementation happens to emit.
 */
Deno.test("auth: basicHeader encodes `${key}:x`, per BambooHR's own curl sample", () => {
  assertEquals(PASSWORD, "x");
  assertEquals(
    basicHeader("abc123"),
    `Basic ${encodeBase64(new TextEncoder().encode("abc123:x"))}`,
  );

  // And the concrete value, so a regression is legible in the diff.
  assertEquals(basicHeader("abc123"), "Basic YWJjMTIzOng=");
  assertEquals(atob("YWJjMTIzOng="), "abc123:x");
});

Deno.test("auth: the password is `x`, NOT empty — close's format is one char away", () => {
  // `close` in this same pack is also Basic-with-key-as-username but fixes the
  // password EMPTY. The two are not interchangeable, and this is the assertion
  // that catches a copy-paste between them.
  assert(basicHeader("abc123") !== `Basic ${btoa("abc123:")}`);
  assertEquals(atob(basicHeader("abc123").slice("Basic ".length)).endsWith(":x"), true);
});

Deno.test("auth: sign stamps the Authorization header and returns the request", () => {
  const request = {
    url: "https://acme.bamboohr.com/api/v1/employees/0",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const { ctx } = mockCtx();
  const signed = apiKey.sign!(
    { request, credential: { subdomain: "acme", apiKey: "abc123" } },
    ctx,
  );
  assertEquals((signed as typeof request).headers["authorization"], "Basic YWJjMTIzOng=");
});

Deno.test("auth: sign does not rewrite the request URL", () => {
  // The host travels via `connection.display.subdomain`, not from inside `sign`.
  // Rewriting it here would hide the destination from the action that built it.
  const url = "https://acme.bamboohr.com/api/v1/employees/0";
  const request = { url, method: "GET", headers: {} as Record<string, string> };
  const { ctx } = mockCtx();
  const signed = apiKey.sign!({ request, credential: { subdomain: "other", apiKey: "k" } }, ctx);
  assertEquals((signed as typeof request).url, url);
});

// ------------------------------------------------------------------ the test hook --

Deno.test("auth: test probes /employees/0 — the scope-free whoami", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42", firstName: "Ava" } }]);
  const result = await apiKey.test!({ credential: { subdomain: "acme", apiKey: "abc123" } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://acme.bamboohr.com/api/v1/employees/0");
  assertEquals(calls[0].headers["authorization"], "Basic YWJjMTIzOng=");
  assertEquals(calls[0].headers["accept"], "application/json");
  // No `fields` — asking for any would drag field-level permissions into a
  // liveness check, which is how a working key gets reported as broken.
  assertEquals(new URL(calls[0].url).searchParams.has("fields"), false);
});

Deno.test("auth: test accepts an integration key that is bound to no employee", async () => {
  // Documented: `0` returns only `{"id": "0"}` for integration-style accounts.
  // That is a live key, not a failure.
  const { ctx } = mockCtx([{ body: { id: "0" } }]);
  assertEquals((await apiKey.test!({ credential: { subdomain: "a", apiKey: "k" } }, ctx)).ok, true);
});

Deno.test("auth: test distinguishes 401, 403 and 404 — the fixes differ", async () => {
  const cases: Array<[number, string]> = [
    [401, "401"],
    [403, "403"],
    [404, "company domain"],
  ];
  for (const [status, needle] of cases) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const r = await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx);
    assertEquals(r.ok, false, `${status} must not pass`);
    assert(r.message?.includes(needle), `${status}: message lacked "${needle}" — got ${r.message}`);
  }
});

Deno.test("auth: a 403 explains the lockout, not just the permission", async () => {
  // BambooHR disables API access for a while after repeated unknown-key
  // attempts, and reports that as 403 too. Telling someone to re-check a key
  // they already fixed is a bad half hour.
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const r = await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx);
  assert(/disabled|unknown key/i.test(r.message ?? ""), `got: ${r.message}`);
});

Deno.test("auth: test rejects a missing or malformed credential without calling out", async () => {
  const { ctx: c1, calls: k1 } = mockCtx([]);
  assertEquals((await apiKey.test!({ credential: {} }, c1)).ok, false);
  assertEquals(k1.length, 0, "must not make a request without a credential");

  const { ctx: c2, calls: k2 } = mockCtx([]);
  const r = await apiKey.test!({ credential: { subdomain: "evil.example.com", apiKey: "k" } }, c2);
  assertEquals(r.ok, false);
  assert(r.message?.includes("not a BambooHR company domain"), `got: ${r.message}`);
  assertEquals(k2.length, 0, "must not make a request to a rejected host");
});

Deno.test("auth: test surfaces the error header on an unexpected status", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    headers: { "x-bamboohr-error-message": "upstream exploded" },
    body: "",
  }]);
  const r = await apiKey.test!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx);
  assertEquals(r, { ok: false, message: "upstream exploded" });
});

// ----------------------------------------------------------------- afterConnect --

Deno.test("afterConnect: publishes the subdomain so actions can build a base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { displayName: "Acme Inc", legalName: "Acme LLC" } }]);
  const display = await apiKey.afterConnect!(
    { credential: { subdomain: "https://ACME.bamboohr.com/", apiKey: "abc123" } },
    ctx,
  );

  // Normalised, and flat — `afterConnect` returns the display object itself.
  assertEquals(display, { subdomain: "acme", companyName: "Acme Inc" });
  assertEquals(calls[0].url, "https://acme.bamboohr.com/api/v1/company_information");
});

Deno.test("afterConnect: prefers displayName, falls back to legalName", async () => {
  const { ctx } = mockCtx([{ body: { legalName: "Acme LLC" } }]);
  const d = await apiKey.afterConnect!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx);
  assertEquals((d as { companyName: string }).companyName, "Acme LLC");
});

Deno.test("afterConnect: a failed lookup still publishes the subdomain", async () => {
  // The label is cosmetic; the subdomain is what every action depends on.
  // Failing here would block a perfectly good credential.
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const d = await apiKey.afterConnect!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx);
  assertEquals(d, { subdomain: "acme", companyName: "acme" });
});

Deno.test("afterConnect: a malformed subdomain degrades instead of throwing", async () => {
  const { ctx, calls } = mockCtx([]);
  const d = await apiKey.afterConnect!({ credential: { subdomain: "a.b.c", apiKey: "k" } }, ctx);
  assertEquals(d, { subdomain: "a.b.c", companyName: "a.b.c" });
  assertEquals(calls.length, 0, "must not call a host it refused to build");
});

Deno.test("auth: the connection label renders from the published display keys", () => {
  // `connectionLabel` is interpolated against `connection.display`, so every
  // placeholder in it must be a key `afterConnect` actually returns.
  const label = apiKey.connectionLabel!;
  for (const m of label.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    assert(
      ["companyName", "subdomain"].includes(m[1]),
      `connectionLabel references {{${m[1]}}}, which afterConnect never publishes`,
    );
  }
});
