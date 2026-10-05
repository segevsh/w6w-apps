import { assert, assertEquals } from "@std/assert";
import oauth2, { PROBE_PATH } from "../../auth/oauth2.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "ory_at_unitTestFixtureNotReal";

Deno.test("oauth2: endpoints are the authn.read.ai discovery values", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://authn.read.ai/oauth2/auth");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://authn.read.ai/oauth2/token");
  assert(oauth2.oauth2?.scopes?.includes("offline_access"), "no refresh token without it");
  assert(oauth2.oauth2?.scopes?.includes("meeting:read"));
});

Deno.test("oauth2: sign stamps the bearer header only", () => {
  const request = { method: "GET", url: "https://api.read.ai/v1/meetings", headers: {} } as {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.read.ai/v1/meetings");
});

Deno.test("oauth2: test passes on 200 and probes meetings?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", has_more: false, data: [] } }]);
  assertEquals(await oauth2.test({ credential: { accessToken: TOKEN } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/meetings");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(PROBE_PATH, "/v1/meetings?limit=1");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test fails without a token and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await oauth2.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: invalid_token is classified from the body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { detail: { error: "invalid_token", error_description: "Token expired" } },
  }]);
  const r = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("invalid_token"));
  assert(r.message?.includes("reconnect"));
});

Deno.test("oauth2: 429 reports rate limiting, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { detail: "Too many requests" } }]);
  const r = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Rate limited"));
});
