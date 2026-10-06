import { assert, assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH, signUrl } from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey000000000000";

Deno.test("api-key: sign appends the token query parameter and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://integration.upsales.com/api/v2/contacts?limit=5",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(queryOf(signed.url), { limit: "5", token: KEY });
  assertEquals(pathOf(signed.url), "/api/v2/contacts");
  assertEquals(signed.headers, {});
});

Deno.test("api-key: sign replaces a pre-existing token rather than duplicating it", () => {
  assertEquals(
    new URL(signUrl("https://integration.upsales.com/api/v2/self?token=old", KEY)).searchParams
      .getAll("token"),
    [KEY],
  );
});

Deno.test("api-key: the probe is /self", () => {
  assertEquals(PROBE_PATH, "/self");
});

Deno.test("api-key: test passes on a user record", async () => {
  const { ctx, calls } = mockCtx([{ body: { errors: null, data: { id: 70896, name: "x" } } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/self");
  assertEquals(queryOf(calls[0].url), { token: KEY });
});

Deno.test("api-key: test fails with no key, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiKey.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a plain-text Unauthorized body is a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected"));
  assert(!r.message?.includes(KEY), "the message must not echo the key");
});

Deno.test("api-key: a 200 that is not a user record is not a pass", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>app</html>" }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("not the documented /self shape"));
});

Deno.test("api-key: a 200 JSON envelope without data.id is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { error: null, data: {} } }]);
  assertEquals((await apiKey.test({ credential: { apiKey: KEY } }, ctx)).ok, false);
});

Deno.test("api-key: ThrottleLimit is reported as rate-limited, not as a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rate-limiting"));
});

Deno.test("api-key: any other failure reports its status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "oops" }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("503"));
});
