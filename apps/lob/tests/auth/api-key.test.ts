import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, isPublishable, modeOf, probeFor } from "../../auth/api-key.ts";
import { bodyOf, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

// Deliberately NOT key-shaped: a hex-tailed `test_…` fixture trips GitHub push protection.
const SECRET = "test_FAKE-fixture-not-a-real-lob-key";

Deno.test("sign: stamps Basic auth with the key as username and an EMPTY password", async () => {
  const request = {
    url: "https://api.lob.com/v1/addresses",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await apiKey.sign!(
    { request, credential: { apiKey: SECRET } } as never,
    mockCtx().ctx,
  );
  assertEquals(signed.headers.authorization, `Basic ${btoa(`${SECRET}:`)}`);
  assertEquals(atob(signed.headers.authorization.slice(6)), `${SECRET}:`);
  assert(!signed.url.includes(SECRET), "the key must never be put in the URL");
});

Deno.test("authHeaders: trims whitespace pasted around the key", () => {
  assertEquals(
    authHeaders({ apiKey: `  ${SECRET}\n` }).authorization,
    `Basic ${btoa(`${SECRET}:`)}`,
  );
});

Deno.test("modeOf / isPublishable: read the environment from the prefix", () => {
  assertEquals(modeOf("test_abc"), "test");
  assertEquals(modeOf("live_abc"), "live");
  assertEquals(modeOf("sk_abc"), undefined);
  assertEquals(isPublishable("live_pub_abc"), true);
  assertEquals(isPublishable("live_abc"), false);
});

Deno.test("probeFor: a secret key reads the address book, a publishable key autocompletes", () => {
  assertEquals(probeFor(SECRET).path, "/addresses?limit=1");
  assertEquals(probeFor(SECRET).method, "GET");
  assertEquals(probeFor("test_pub_abc").path, "/us_autocompletions");
  assertEquals(probeFor("test_pub_abc").method, "POST");
});

Deno.test("test: a 200 from the address-book probe is ok, and the probe is signed", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [], count: 0 } }]);
  const result = await apiKey.test!({ credential: { apiKey: SECRET } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/addresses");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Basic ${btoa(`${SECRET}:`)}`);
});

Deno.test("test: a publishable key is probed through autocomplete and passes", async () => {
  const { ctx, calls } = mockCtx([{ body: { suggestions: [] } }]);
  const result = await apiKey.test!(
    { credential: { apiKey: "live_pub_0123456789abcdef" } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/us_autocompletions");
  assertEquals(bodyOf(calls[0]), { address_prefix: "1" });
});

Deno.test("test: invalid_api_key and unauthorized are both 401 but get different advice", async () => {
  const bad = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_key", "Your API key is not valid.", 401),
  }]);
  const badResult = await apiKey.test!({ credential: { apiKey: SECRET } } as never, bad.ctx);
  assertEquals(badResult.ok, false);
  assert(badResult.message?.includes("invalid_api_key"));

  const missing = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "Missing authentication", 401),
  }]);
  const missingResult = await apiKey.test!(
    { credential: { apiKey: SECRET } } as never,
    missing.ctx,
  );
  assertEquals(missingResult.ok, false);
  assert(missingResult.message?.includes("reconnect"));
});

Deno.test("test: validity comes from the body code, not the status", async () => {
  // A rejected key that arrives under a non-401 status is still a rejection...
  const odd = mockCtx([{ status: 400, body: errorBody("invalid_api_key", "bad", 400) }]);
  assertEquals(
    (await apiKey.test!({ credential: { apiKey: SECRET } } as never, odd.ctx)).ok,
    false,
  );
  // ...and an authenticated refusal on its merits proves the key.
  const refused = mockCtx([{ status: 403, body: errorBody("forbidden", "not on your plan", 403) }]);
  assertEquals(
    (await apiKey.test!({ credential: { apiKey: SECRET } } as never, refused.ctx)).ok,
    true,
  );
});

Deno.test("test: a 5xx, a 429 or an unreadable 401 is inconclusive, never a pass", async () => {
  for (
    const r of [
      { status: 503, body: "<html>bad gateway</html>" },
      { status: 429, body: errorBody("rate_limit_exceeded", "slow down", 429) },
      { status: 401, body: "nope" },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    assertEquals((await apiKey.test!({ credential: { apiKey: SECRET } } as never, ctx)).ok, false);
  }
});

Deno.test("test: a missing or malformed key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test!({ credential: {} } as never, ctx)).ok, false);
  const malformed = await apiKey.test!({ credential: { apiKey: "sk_live_x" } } as never, ctx);
  assertEquals(malformed.ok, false);
  assert(malformed.message?.includes("test_ or live_"));
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: labels the Connection test or live from the key, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: SECRET } } as never, ctx), {
    mode: "test",
  });
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "live_abc" } } as never, ctx), {
    mode: "live",
  });
  assertEquals(calls.length, 0);
});

Deno.test("the probe response is never the credential: it is not a whoami", () => {
  for (const key of [SECRET, "test_pub_x"]) {
    assert(!/me|apikey/i.test(probeFor(key).path));
  }
});
