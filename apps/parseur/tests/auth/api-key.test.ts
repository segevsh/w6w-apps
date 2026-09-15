import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealParseurKey00000";

Deno.test("api-key: sign stamps the bare key — no Token or Bearer prefix", () => {
  const request = {
    method: "GET",
    url: "https://api.parseur.com/parser",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, KEY);
  assert(!/^Token\s/.test(signed.headers.authorization));
  assert(!/^Bearer\s/.test(signed.headers.authorization));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: KEY });
});

Deno.test("api-key: test passes when GET / answers ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { document: "...", parser: "..." } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/");
  assertEquals(calls[0].headers.authorization, KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test('api-key: "Not authenticated" is reported as the credential never arriving', async () => {
  const { ctx } = mockCtx([{ status: 403, body: { non_field_errors: "Not authenticated" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no key/i.test(result.message ?? ""), result.message);
});

Deno.test('api-key: "Authentication failed" is reported as a rejected key', async () => {
  const { ctx } = mockCtx([{ status: 403, body: { non_field_errors: "Authentication failed" } }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an unrecognised failure is reported as a bare HTTP status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: has no afterConnect — there is no whoami endpoint to call", () => {
  assertEquals(apiKey.afterConnect, undefined);
});
