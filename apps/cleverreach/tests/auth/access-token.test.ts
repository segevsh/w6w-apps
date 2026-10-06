import { assert, assertEquals } from "@std/assert";
import accessToken, { probeToken } from "../../auth/access-token.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";

const TOKEN = "unitTestFixtureAccessTokenNotReal0000";

Deno.test("access-token: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://rest.cleverreach.com/v3/groups",
    headers: {} as Record<string, string>,
  };
  const signed = accessToken.sign!(
    { request, credential: { accessToken: TOKEN } },
    {} as never,
  ) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://rest.cleverreach.com/v3/groups");
});

Deno.test("access-token: test passes when /v3/debug/ttl answers, and never echoes the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ttl: 31535999, token: TOKEN } }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/debug/ttl");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("access-token: a vendor error body fails the test, even on a 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: unauthorized }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("Unauthorized"));
  assert(!result.message!.includes(TOKEN));
});

Deno.test("access-token: a 401 fails with guidance and no token in the message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorized }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("Extras"));
  assert(!result.message!.includes(TOKEN));
});

Deno.test("access-token: no token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: a network failure is reported, not thrown", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} } as never;
  const result = await probeToken(TOKEN, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("boom"));
});
