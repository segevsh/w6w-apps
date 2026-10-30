import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { cfOk, mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

test("api-token: sign injects a Bearer header", async () => {
  const request = { url: "https://api.cloudflare.com/client/v4/zones", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { apiToken: "cf-secret" } }, {
    fetch: () => {
      throw new Error("sign must not call fetch");
    },
    log: () => {},
  });
  assertEquals(signed.headers["authorization"], "Bearer cf-secret");
});

test("api-token: test passes for an active token", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: cfOk({ id: "t1", status: "active" }) },
  ]);
  const result = await auth.test({ credential: { apiToken: "cf-secret" } }, ctx);
  assertEquals(result, { ok: true });
});

test("api-token: test fails for a disabled token", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: cfOk({ id: "t1", status: "disabled" }) },
  ]);
  const result = await auth.test({ credential: { apiToken: "cf-secret" } }, ctx);
  assertEquals(result.ok, false);
});

test("api-token: test fails on a non-2xx response", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { success: false, errors: [{ code: 1000, message: "invalid token" }] } },
  ]);
  const result = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});
