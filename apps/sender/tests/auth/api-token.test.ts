import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { API_ROOT, mockCtx, pathOf } from "../_helpers.ts";

test("api-token: sign injects the bearer header and nothing else", () => {
  const request = {
    headers: {} as Record<string, string>,
    url: "https://api.sender.net/v2/groups",
  };
  const out = apiToken.sign!(
    { request, credential: { apiToken: "secret-token" } } as never,
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer secret-token");
  assertEquals(Object.keys(out.headers).length, 1);
});

test("authHeaders builds the exact wire format", () => {
  assertEquals(authHeaders({ apiToken: "abc" }), { authorization: "Bearer abc" });
});

test("api-token: test() probes GET /v2/groups?limit=1 and succeeds on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const out = await apiToken.test({ credential: { apiToken: "abc" } } as never, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/groups");
  assertEquals(calls[0].headers["authorization"], "Bearer abc");
});

test("api-token: test() reports missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test({ credential: { apiToken: "" } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

test("api-token: test() classifies a 401 from the response body's message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const out = await apiToken.test({ credential: { apiToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
  assertEquals(out.message?.includes("Unauthenticated."), true);
});

test("api-token: test() never returns ok on a non-2xx even without a message body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await apiToken.test({ credential: { apiToken: "abc" } } as never, ctx);
  assertEquals(out.ok, false);
});

test("api-token: probe URL is scoped to api.sender.net", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await apiToken.test({ credential: { apiToken: "abc" } } as never, ctx);
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/groups`), true, calls[0].url);
});
