import { assertEquals } from "@std/assert";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("authHeaders - builds the Bearer header", () => {
  assertEquals(authHeaders({ apiToken: "tok_123" }), { authorization: "Bearer tok_123" });
});

Deno.test("sign - injects the Authorization header and returns the request", () => {
  const request = {
    url: "https://api.float.com/v3/people",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiToken.sign!(
    { request, credential: { apiToken: "tok_123" } },
    mockCtx().ctx,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer tok_123");
  assertEquals(out, request); // same object, mutated in place
});

Deno.test("test - missing apiToken fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test - 200 on the departments probe is a live token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await apiToken.test({ credential: { apiToken: "tok_good" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.float.com/v3/departments?per-page=1");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_good");
});

Deno.test("test - a real JSON 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: { "content-type": "application/json" },
      body: {
        name: "Unauthorized",
        message: "Your request was made with invalid credentials.",
        status: 401,
      },
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "tok_bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Float rejected the token"), true);
});

Deno.test("test - a non-JSON 403 (edge/WAF refusal) does not crash on res.json() and is reported distinctly", async () => {
  const { ctx } = mockCtx([
    { status: 403, headers: { "content-type": "text/html; charset=UTF-8" }, body: "403 Forbidden" },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "tok_whatever" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("no JSON body"), true);
});
