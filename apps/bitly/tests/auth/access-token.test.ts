import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: sign injects Authorization: Bearer <token>", async () => {
  const request = { url: "https://api-ssl.bitly.com/v4/user", method: "GET", headers: {} };
  const out = await auth.sign!(
    { request, credential: { accessToken: "secret-token" } },
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer secret-token");
});

Deno.test("access-token: test() calls GET /user with Bearer auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { login: "ada" } }]);
  const out = await auth.test({ credential: { accessToken: "secret-token" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].url, "https://api-ssl.bitly.com/v4/user");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-token");
});

Deno.test("access-token: test() reports failure on non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "FORBIDDEN" } }]);
  const out = await auth.test({ credential: { accessToken: "bad-token" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("access-token: test() short-circuits when credential is missing accessToken", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: afterConnect() surfaces the login", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { login: "ada", name: "Ada Lovelace" } }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "secret-token" } }, ctx);
  assertEquals(out.login, "ada");
});

Deno.test("access-token: afterConnect() returns {} on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "secret-token" } }, ctx);
  assertEquals(out, {});
});
