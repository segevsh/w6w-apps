import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiToken from "../../auth/api-token.ts";

Deno.test("api-token: sign injects the bearer token", async () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = await apiToken.sign!(
    { request, credential: { apiToken: "tok-123" } } as never,
    {} as never,
  );
  assertEquals(out.headers["authorization"], "Bearer tok-123");
});

Deno.test("api-token: test fails cleanly when credential fields are missing", async () => {
  const { ctx } = mockCtx();
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "credential missing slug or apiToken");
});

Deno.test("api-token: test passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "1" } } }]);
  const result = await apiToken.test({ credential: { slug: "acme", apiToken: "tok" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("api-token: test flags a 401 and mentions the 24-hour expiry", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", message: "You are not authorized to access this content." },
  }]);
  const result = await apiToken.test({ credential: { slug: "acme", apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("expire after 24 hours"), true);
});

Deno.test("api-token: test diagnoses a 404 as a wrong slug", async () => {
  const { ctx } = mockCtx([{ status: 404, body: {} }]);
  const result = await apiToken.test({ credential: { slug: "nope", apiToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("check the slug"), true);
});

Deno.test("api-token: afterConnect records the slug and the token owner's name, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: "1", attributes: { first_name: "Kim", last_name: "Possible" } } },
  }]);
  const display = await apiToken.afterConnect!(
    { credential: { slug: "acme", apiToken: "tok" } } as never,
    ctx,
  );
  assertEquals(display, { slug: "acme", user: { name: "Kim Possible" } });
});

Deno.test("api-token: does not declare a refresh hook — the docs say no refresh token is issued", () => {
  assertEquals(apiToken.refresh, undefined);
});
