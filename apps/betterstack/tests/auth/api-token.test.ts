import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealToken0000";
const REJECTION = {
  errors: "Invalid Team API token. How to find your Team API token: https://betterstack.com/docs",
};

Deno.test("api-token: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://uptime.betterstack.com/api/v2/monitors",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is monitor-groups, which returns names and no secrets", () => {
  assertEquals(PROBE_PATH, "/api/v2/monitor-groups");
});

Deno.test("api-token: test passes when the probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: { next: null } } }]);
  assertEquals(await apiToken.test({ credential: { apiToken: TOKEN } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/monitor-groups");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: { apiToken: "  " } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: a rejection is recognised from the body, not the status", async () => {
  for (const status of [401, 403, 400]) {
    const { ctx } = mockCtx([{ status, body: REJECTION }]);
    const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);
    assertEquals(result.ok, false);
    assert(/rejected the token/i.test(result.message ?? ""), `${status}: ${result.message}`);
  }
});

Deno.test("api-token: a 401 that is not the token rejection is reported verbatim", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Something else" } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Something else"));
  assert(!/rejected the token/i.test(result.message ?? ""));
});

Deno.test("api-token: a 5xx with no JSON body is reported as an HTTP error", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("502"));
});

Deno.test("api-token: the field is a secret", () => {
  assertEquals(apiToken.fields?.[0].type, "secret");
});
