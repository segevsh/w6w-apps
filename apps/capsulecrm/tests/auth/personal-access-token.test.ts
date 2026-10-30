import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import auth from "../../auth/personal-access-token.ts";
import { mockCtx } from "../_helpers.ts";

test("personal-access-token: sign() sets Authorization: Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.capsulecrm.com/api/v2/users/current",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "tok_123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok_123");
});

test("test(): missing token fails without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

test("test(): a live token calling /users/current passes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: { id: 1 } } }]);
  const result = await auth.test({ credential: { token: "tok_123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/users/current");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
});

test("test(): 401 fails with a message naming My Preferences, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Requires authentication" },
    headers: { "www-authenticate": 'Bearer realm="capsule", error="invalid_token"' },
  }]);
  const result = await auth.test({ credential: { token: "tok_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("tok_123"), false);
  assertEquals(result.message?.includes("My Preferences"), true);
});

test("test(): an unexpected status still fails with detail, not a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test({ credential: { token: "tok_123" } }, ctx);
  assertEquals(result.ok, false);
});

test("afterConnect: records name/username, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { user: { id: 1, name: "Scott Spacey", username: "scott" } },
  }]);
  const display = await auth.afterConnect!({ credential: { token: "tok_123" } }, ctx);
  assertEquals(display, { name: "Scott Spacey", username: "scott" });
  assertEquals(JSON.stringify(display).includes("tok_123"), false);
});

test("afterConnect: a failed lookup returns an empty display rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: { token: "tok_123" } }, ctx);
  assertEquals(display, {});
});
