import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/page-token.ts";

test("page-token: bearer with one required secret accessToken", () => {
  assertEquals(auth.key, "page-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields?.[0].key, "accessToken");
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[0].required, true);
});

test("page-token: sign stamps the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

test("page-token: test without a token makes no call", async () => {
  const { ctx, calls } = mockCtx();
  const r = await auth.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

test("page-token: test passes on a body carrying the Page id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", name: "My Page" } }]);
  const r = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(r.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/me");
  assertEquals(url.searchParams.get("fields"), "id,name");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

test("page-token: test classifies code 190 from the body and does not echo the token", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: { message: "Error validating access token", code: 190, type: "OAuthException" },
    },
  }]);
  const r = await auth.test({ credential: { accessToken: "SECRET-TOKEN" } }, ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("190"));
  assert(!(r.message ?? "").includes("SECRET-TOKEN"));
});

test("page-token: test reports other Graph errors with their code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { message: "denied", code: 10 } } }]);
  const r = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("10"));
});

test("page-token: a 200 without an id is not a pass", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const r = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(r.ok, false);
});

test("page-token: afterConnect labels the connection with the Page", async () => {
  const { ctx } = mockCtx([{ body: { id: "p1", name: "My Page" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    page: { id: "p1", name: "My Page" },
  });
});

test("page-token: afterConnect tolerates a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
