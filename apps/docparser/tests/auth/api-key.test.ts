import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey0000";

Deno.test("api-key: sign stamps the api_key header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.docparser.com/v1/parsers",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.api_key, KEY);
  assertEquals(signed.url, "https://api.docparser.com/v1/parsers");
  assertEquals(authHeaders({ apiKey: KEY }), { api_key: KEY });
});

Deno.test("api-key: declared as an apiKey header method probing /v1/ping", () => {
  assertEquals(PROBE_PATH, "/v1/ping");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.key, "api-key");
});

Deno.test("api-key: test passes on {msg: pong}", async () => {
  const { ctx, calls } = mockCtx([{ body: { msg: "pong" } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(calls[0].headers.api_key, KEY);
});

Deno.test("api-key: test fails without a key, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: classifies from the body, not the status", async () => {
  // Real invalid-key answer: 403 {"error":"api key not valid"}.
  const bad = mockCtx([{ status: 403, body: { error: "api key not valid" } }]);
  const r1 = await apiKey.test({ credential: { apiKey: KEY } }, bad.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("rejected the API key"));

  // A 200 that is not {msg: pong} (e.g. an SPA shell) is not a pass.
  const shell = mockCtx([{ body: "<html>app</html>" }]);
  const r2 = await apiKey.test({ credential: { apiKey: KEY } }, shell.ctx);
  assertEquals(r2.ok, false);
  assert(r2.message!.includes("did not answer"));

  // A 5xx with another message is neither a pass nor a key rejection.
  const down = mockCtx([{ status: 503, body: { error: "maintenance" } }]);
  const r3 = await apiKey.test({ credential: { apiKey: KEY } }, down.ctx);
  assertEquals(r3.ok, false);
  assert(r3.message!.includes("503") && !r3.message!.includes("rejected"));
});
