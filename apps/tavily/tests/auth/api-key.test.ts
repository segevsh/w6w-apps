import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const KEY = "tvly-unitTestFixtureNotARealKey";

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "POST",
    url: "https://api.tavily.com/search",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.tavily.com/search");
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is /usage and the credential is sent as a header", async () => {
  assertEquals(PROBE_PATH, "/usage");
  const { ctx, calls } = mockCtx([{ body: { key: {}, account: {} } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/usage");
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: a missing key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiKey.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: 401 with the vendor body is a rejection", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized: missing or invalid API key."),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("missing or invalid API key"));
});

Deno.test("api-key: 432 and 433 prove a live key that is out of credits", async () => {
  for (const status of [429, 432, 433]) {
    const { ctx } = mockCtx([{ status, body: errorBody("limit") }]);
    assertEquals(
      await apiKey.test({ credential: { apiKey: KEY } }, ctx),
      { ok: true },
      `${status}`,
    );
  }
});

Deno.test("api-key: an unexplained 500 is a failure naming the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("Internal Server Error") }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("500"));
});

Deno.test("api-key: the credential never appears in a message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assert(!JSON.stringify(r).includes(KEY));
});
