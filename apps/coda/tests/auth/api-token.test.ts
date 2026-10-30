import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

test("api-token: sign injects Authorization: Bearer <token>", async () => {
  const request = { url: "https://coda.io/apis/v1/whoami", method: "GET", headers: {} };
  const out = await auth.sign!(
    { request, credential: { apiToken: "secret-token" } },
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer secret-token");
});

test("api-token: test() calls GET /whoami with Bearer auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Ada" } }]);
  const out = await auth.test({ credential: { apiToken: "secret-token" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].url, "https://coda.io/apis/v1/whoami");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-token");
});

test("api-token: test() reports failure on non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "invalid token" } }]);
  const out = await auth.test({ credential: { apiToken: "bad-token" } }, ctx);
  assertEquals(out.ok, false);
});

test("api-token: test() short-circuits when credential is missing apiToken", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

test("api-token: afterConnect() surfaces the whoami name", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { name: "Ada Lovelace", loginId: "ada@example.com" },
  }]);
  const out = await auth.afterConnect!({ credential: { apiToken: "secret-token" } }, ctx);
  assertEquals(out.name, "Ada Lovelace");
});

test("api-token: afterConnect() returns {} on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!({ credential: { apiToken: "secret-token" } }, ctx);
  assertEquals(out, {});
});
