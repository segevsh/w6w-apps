import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const cred = { apiKey: "AIza-test" };

/**
 * The generation-1 web services reject `X-Goog-Api-Key` outright — probed live
 * 2026-08-18 — so the only form that works across the whole surface is `?key=`.
 */
Deno.test("api-key: signs into the query string, not a header", () => {
  const request = {
    url: "https://maps.googleapis.com/maps/api/geocode/json?address=x",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  const url = new URL(signed.url);
  assertEquals(url.searchParams.get("key"), "AIza-test");
  assertEquals(url.searchParams.get("address"), "x");
  assertEquals(Object.keys(signed.headers).length, 0);
});

Deno.test("api-key: the runtime is told where the key goes", () => {
  assertEquals(auth.apiKey, { in: "query", name: "key" });
  assertEquals(auth.type, "apiKey");
});

Deno.test("api-key: signing twice does not duplicate the parameter", () => {
  const request = { url: "https://maps.googleapis.com/maps/api/geocode/json", headers: {} };
  const once = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  const twice = auth.sign!(
    { request: once, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(new URL(twice.url).searchParams.getAll("key").length, 1);
});

Deno.test("api-key: a good key reports success, and says what it did NOT prove", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "OK", results: [{ formatted_address: "1600 Amphitheatre Pkwy" }] },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, true);
  assert(/enabled separately/.test(result.message!), result.message);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/maps/api/geocode/json");
  assertEquals(url.searchParams.get("key"), "AIza-test");
});

/**
 * The whole point of reading the body: a refused key arrives as HTTP 200, so a
 * test checking `res.ok` would report a broken key as connected.
 */
Deno.test("api-key: a refused key inside a 200 fails the test", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "REQUEST_DENIED", error_message: "The provided API key is invalid. " },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/REQUEST_DENIED/.test(result.message!), result.message);
  assert(/HTTP referrers/.test(result.message!), result.message);
});

/** ZERO_RESULTS would mean the key works — but the probe address is famous. */
Deno.test("api-key: an unexpected status is not read as success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "ZERO_RESULTS", results: [] } }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("api-key: a missing key fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: an HTTP failure and an unreachable host both fail cleanly", async () => {
  const http = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await auth.test!({ credential: cred } as never, http.ctx)).ok, false);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, offline);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

Deno.test("api-key: a non-JSON body fails rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, false);
});

/** The restriction that silently breaks every server integration. */
Deno.test("api-key: the field hint warns about referrer restrictions", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assert(/never HTTP referrers/.test(field.hint!), field.hint);
  assertEquals(field.type, "secret");
});
