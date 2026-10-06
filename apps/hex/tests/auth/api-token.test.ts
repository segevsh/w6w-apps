import { assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const call = (hook: any, cred: unknown, ctx: unknown) => hook({ credential: cred }, ctx);

Deno.test("api-token: declares a bearer method with a secret apiToken field", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.fields![0].key, "apiToken");
  assertEquals(apiToken.fields![0].type, "secret");
});

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = { url: "https://app.hex.tech/api/v1/projects", method: "GET", headers: {} };
  // deno-lint-ignore no-explicit-any
  const out = (apiToken as any).sign({ request, credential: { apiToken: "hex_abc" } });
  assertEquals(out.headers, { authorization: "Bearer hex_abc" });
});

Deno.test("api-token: test passes on 200 and probes GET /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { org: { id: "o1" }, token: { exp: 1 } } }]);
  assertEquals(await call(apiToken.test, { apiToken: "t" }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("api-token: test fails on the edge's plain-text 401", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  const r = await call(apiToken.test, { apiToken: "bad" }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message.includes("401"), true);
});

Deno.test("api-token: test fails on a JSON UNAUTHORIZED body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "UNAUTHORIZED", message: "x" } }]);
  assertEquals((await call(apiToken.test, { apiToken: "bad" }, ctx)).ok, false);
});

Deno.test("api-token: a 403 with a structured route error means the token authenticated", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "FORBIDDEN", message: "Insufficient access" },
  }]);
  assertEquals(await call(apiToken.test, { apiToken: "scoped" }, ctx), { ok: true });
});

Deno.test("api-token: a bodiless 403 is not treated as proof of a live token", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: { "content-type": "text/plain" },
    body: "Forbidden",
  }]);
  assertEquals((await call(apiToken.test, { apiToken: "t" }, ctx)).ok, false);
});

Deno.test("api-token: test rejects a missing token without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await call(apiToken.test, {}, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect keeps only label, email and orgId", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "u1",
      name: "Ann",
      email: "a@b.c",
      role: "ADMIN",
      org: { id: "o1" },
      token: { exp: 9 },
    },
  }]);
  assertEquals(await call(apiToken.afterConnect, { apiToken: "t" }, ctx), {
    label: "a@b.c",
    email: "a@b.c",
    orgId: "o1",
  });
});

Deno.test("api-token: afterConnect labels a workspace token by org id", async () => {
  const { ctx } = mockCtx([{ body: { org: { id: "o1" }, token: { exp: 9 } } }]);
  assertEquals(await call(apiToken.afterConnect, { apiToken: "t" }, ctx), {
    label: "o1",
    orgId: "o1",
  });
});

Deno.test("api-token: afterConnect swallows failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals(await call(apiToken.afterConnect, { apiToken: "t" }, ctx), {});
});
