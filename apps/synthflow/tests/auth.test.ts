import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../auth/api-key.ts";
import { errorBody, mockCtx, ok, pathOf, queryOf } from "./_helpers.ts";

const KEY = "synthflow-unit-test-fixture-not-real";

function sign(url: string, region?: string) {
  const request = { method: "GET", url, headers: {} as Record<string, string> };
  return apiKey.sign!({ request, credential: { apiKey: KEY, region } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
}

Deno.test("api-key: sign stamps the bearer header", () => {
  const s = sign("https://api.synthflow.ai/v2/calls", "global");
  assertEquals(s.headers.authorization, `Bearer ${KEY}`);
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
  assert(!s.url.includes(KEY));
});

Deno.test("api-key: sign pins the host to the credential's region", () => {
  assertEquals(
    sign("https://api.synthflow.ai/v2/calls?x=1", "eu").url,
    "https://api.eu.synthflow.ai/v2/calls?x=1",
  );
  assertEquals(
    sign("https://api.eu.synthflow.ai/v2/calls", "us").url,
    "https://api.us.synthflow.ai/v2/calls",
  );
  assertEquals(
    sign("https://api.us.synthflow.ai/v2/calls", undefined).url,
    "https://api.synthflow.ai/v2/calls",
  );
});

Deno.test("api-key: sign never rewrites a non-Synthflow host", () => {
  assertEquals(sign("https://example.com/x", "eu").url, "https://example.com/x");
});

Deno.test("api-key: test passes on a 200 and probes the right region", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ assistants: [] }) }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY, region: "us" } }, ctx), { ok: true });
  assertEquals(new URL(calls[0].url).host, "api.us.synthflow.ai");
  assertEquals(pathOf(calls[0].url), `/v2${PROBE_PATH}`);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: an invalid key is classified from the body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized: Invalid or expired token."),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY, region: "eu" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected the key"));
  assert(r.message!.includes("eu"));
  assert(!r.message!.includes(KEY));
});

Deno.test("api-key: a missing-header body is reported as such", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Missing or invalid Authorization header", "important"),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assert(r.message!.includes("did not receive a usable key"));
});

Deno.test("api-key: a 500 is not called a bad key", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("upstream exploded") }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("HTTP 500"));
  assert(!r.message!.includes("rejected"));
});

Deno.test("api-key: an empty key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test({ credential: { apiKey: " " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect echoes a normalised region", async () => {
  assertEquals(
    await apiKey.afterConnect!({ credential: { apiKey: KEY, region: "EU" } } as never, {} as never),
    { region: "eu" },
  );
});
