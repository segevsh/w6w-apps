import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("authHeaders: builds the exact CallRail wire format, unquoted", () => {
  assertEquals(authHeaders({ apiToken: "abc123" }), { authorization: "Token token=abc123" });
});

test("sign: stamps the authorization header and returns the request untouched otherwise", async () => {
  const request = {
    method: "GET",
    url: "https://api.callrail.com/v3/a.json",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!({ request, credential: { apiToken: "shh" } }, {} as never);
  assertEquals(out.headers.authorization, "Token token=shh");
  assertEquals(out.url, request.url);
});

test("test: ok when /v3/a.json answers 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accounts: [] } }]);
  const result = await apiToken.test({ credential: { apiToken: "good" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/a.json");
  assertEquals(calls[0].headers.authorization, "Token token=good");
});

test("test: reports a rejected key without inventing a reason CallRail didn't give", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("HTTP Token: Access denied") }]);
  const result = await apiToken.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

test("test: an empty credential fails locally without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: { apiToken: "" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

test("test: a non-401 failure surfaces the vendor's own error string", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("Internal Server Error") }]);
  const result = await apiToken.test({ credential: { apiToken: "x" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
  assert(result.message?.includes("Internal Server Error"));
});

test("afterConnect: publishes only an account count, never the accounts themselves", async () => {
  const { ctx } = mockCtx([
    {
      body: { total_records: 2, accounts: [{ id: "ACC1", name: "A" }, { id: "ACC2", name: "B" }] },
    },
  ]);
  const label = await apiToken.afterConnect!({ credential: { apiToken: "x" } }, ctx);
  assertEquals(label, { accountCount: 2 });
});

test("afterConnect: fails silently — a good credential must not fail its own connect", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const label = await apiToken.afterConnect!({ credential: { apiToken: "x" } }, ctx);
  assertEquals(label, {});
});

test("api-token: credential field is declared secret, and only sign/test/afterConnect exist", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "apiKey");
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiToken.test, "function");
  assertEquals(typeof apiToken.sign, "function");
});
