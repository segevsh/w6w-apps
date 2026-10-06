import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "wistia_unitTestFixtureNotARealToken0000";

Deno.test("api-token: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.wistia.com/modern/medias",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.wistia.com/modern/medias");
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is /account, which needs any scope and echoes no token", () => {
  assertEquals(PROBE_PATH, "/account");
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.key, "api-token");
});

Deno.test("api-token: test passes when /account answers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 1, name: "Acme", url: "https://acme.wistia.com" },
  }]);
  assertEquals(await apiToken.test({ credential: { apiToken: TOKEN } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/modern/account");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
});

Deno.test("api-token: test fails with no token, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: classifies failures by the body's code, not the status", async () => {
  const cases: Array<[number, string, string]> = [
    [401, "unauthorized_credentials", "rejected the token"],
    [403, "account_inactive", "inactive"],
    [401, "unauthorized_scope", "unauthorized_scope"],
  ];
  for (const [status, code, expected] of cases) {
    const { ctx } = mockCtx([{ status, body: errorBody(code, "nope") }]);
    const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes(expected), `${code}: ${result.message}`);
  }
  // Same status, different code => different verdict.
  const { ctx } = mockCtx([{ status: 401, body: errorBody("account_inactive", "x") }]);
  assert(
    (await apiToken.test({ credential: { apiToken: TOKEN } }, ctx)).message!.includes("inactive"),
  );
});

Deno.test("api-token: an unrecognised failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("HTTP 500"));
});

Deno.test("api-token: afterConnect labels the connection with the account name", async () => {
  const { ctx } = mockCtx([{ body: { id: 42, name: "Acme", url: "https://acme.wistia.com" } }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } } as never, ctx), {
    accountName: "Acme",
    accountId: "42",
    accountUrl: "https://acme.wistia.com",
  });
  const failing = mockCtx([{ status: 401, body: errorBody("unauthorized_credentials", "x") }]);
  assertEquals(
    await apiToken.afterConnect!({ credential: { apiToken: TOKEN } } as never, failing.ctx),
    {},
  );
});
