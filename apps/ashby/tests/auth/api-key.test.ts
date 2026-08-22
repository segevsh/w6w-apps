import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_VERSION } from "../../lib/client.ts";

const keyInfo = (scopes: string[], title = "Automation Bot") => ({
  status: 200,
  body: { success: true, results: { title, createdAt: "2026-01-01T00:00:00.000Z", scopes } },
});

/** The key is the username and the password is EMPTY — a trailing colon. */
Deno.test("api-key: sign sends Basic auth with an empty password", () => {
  const request = { url: "https://api.ashbyhq.com/job.list", method: "POST", headers: {} };
  const signed = auth.sign!({ request, credential: { apiKey: "key_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], `Basic ${btoa("key_1:")}`);
  assertEquals(atob(signed.headers["authorization"].slice(6)), "key_1:");
  assertEquals(signed.headers["accept"], API_VERSION);
});

/**
 * A key can authenticate perfectly and be refused by every action, so the test
 * reports what it may actually do.
 */
Deno.test("api-key: test reports the key's scopes back", async () => {
  const { ctx, calls } = mockCtx([keyInfo(["candidates:read", "candidates:write"])]);
  const result = await auth.test!({ credential: { apiKey: "key_1" } }, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/apiKey.info");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.ok, true);
  assert(result.message!.includes("candidates:write"), result.message);
  assert(result.message!.includes("Automation Bot"), result.message);
});

/** A key with no scopes authenticates and can do nothing. */
Deno.test("api-key: a key with no scopes connects but is called out", async () => {
  const { ctx } = mockCtx([keyInfo([])]);
  const result = await auth.test!({ credential: { apiKey: "key_1" } }, ctx);
  assertEquals(result.ok, true);
  assert(/no scopes granted/.test(result.message!), result.message);
});

/**
 * A perfectly good key may lack `apiKeysRead`. That is a narrow key working as
 * intended, so the test proves the credential another way rather than failing.
 */
Deno.test("api-key: without apiKeysRead it falls back to a cheap read", async () => {
  const { ctx, calls } = mockCtx([
    { status: 403, body: "Forbidden" },
    { status: 200, body: { success: true, results: [] } },
  ]);
  const result = await auth.test!({ credential: { apiKey: "key_1" } }, ctx);
  assertEquals(calls[1].url, "https://api.ashbyhq.com/source.list");
  assertEquals(result.ok, true);
  assert(/cannot read its own permissions/.test(result.message!), result.message);
});

Deno.test("api-key: a key refused by the fallback too does not connect", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: "Forbidden" },
    { status: 403, body: "Forbidden" },
  ]);
  const result = await auth.test!({ credential: { apiKey: "key_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/deactivated/.test(result.message!), result.message);
});

Deno.test("api-key: a 401 says no key arrived at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await auth.test!({ credential: { apiKey: "key_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 1);
  assert(/received no API key/.test(result.message!), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The title and scopes are public metadata; the key never is. */
Deno.test("api-key: afterConnect records the title and scopes, not the key", async () => {
  const { ctx } = mockCtx([keyInfo(["jobs:read"], "Reporting Key")]);
  const display = await auth.afterConnect!({ credential: { apiKey: "key_secret" } }, ctx);
  assertEquals(display, { keyTitle: "Reporting Key", scopes: ["jobs:read"] });
  assert(!JSON.stringify(display).includes("key_secret"));
});

Deno.test("api-key: afterConnect degrades quietly when the key cannot read itself", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "key_1" } }, ctx), {});
});

Deno.test("api-key: declares one secret field and is basic auth", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});
