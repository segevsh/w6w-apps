import { assert, assertEquals } from "@std/assert";
import kvcoreBearer, { authHeaders, PROBE_PATH } from "../../auth/bearer-token.ts";
import { errorsBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "unit.test.fixture.not.a.real.token";

Deno.test("bearer-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.kvcore.com/v2/public/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = kvcoreBearer.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.kvcore.com/v2/public/contacts");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("bearer-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("bearer-token: the probe path is /contacts", () => {
  assertEquals(PROBE_PATH, "/contacts");
});

Deno.test("bearer-token: test passes when the contacts read answers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  const result = await kvcoreBearer.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/public/contacts");
  assertEquals(queryOf(calls[0].url), { limit: ["1"] });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("bearer-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await kvcoreBearer.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("bearer-token: a 401 is reported as a rejected token, with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorsBody("Authentication Failed") }]);
  const result = await kvcoreBearer.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(/Authentication Failed/.test(result.message ?? ""), result.message);
});

/**
 * The one documented gap: a Users-only scoped token legitimately cannot read
 * /contacts, and the message must say so rather than reporting a flat
 * "invalid credential".
 */
Deno.test("bearer-token: a 403 explains the Users-only-scope caveat, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorsBody("Insufficient scope") }]);
  const result = await kvcoreBearer.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/Users/.test(result.message ?? ""), result.message);
  assert(/may still be live/i.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await kvcoreBearer.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: no fields are anything but secret", () => {
  for (const f of kvcoreBearer.fields ?? []) {
    assertEquals(f.type, "secret", f.key);
  }
});
