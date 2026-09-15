import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: sign injects the bearer token", async () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = await oauth2.sign!(
    { request, credential: { accessToken: "tok-123" } } as never,
    {} as never,
  );
  assertEquals(out.headers["authorization"], "Bearer tok-123");
});

Deno.test("oauth2: test hits /signups/me with the bearer token, no slug/token means a clean error", async () => {
  const { ctx } = mockCtx();
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "credential missing slug or accessToken");
});

Deno.test("oauth2: test passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "1" } } }]);
  const result = await oauth2.test(
    { credential: { slug: "acme", accessToken: "tok" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test surfaces a 401 with the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", message: "You are not authorized to access this content." },
  }]);
  const result = await oauth2.test({ credential: { slug: "acme", accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    "NationBuilder rejected the token (401: unauthorized: You are not authorized to access " +
      "this content.).",
  );
});

Deno.test("oauth2: afterConnect records the slug and the caller's own name, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: "1", attributes: { first_name: "Kim", last_name: "Possible" } } },
  }]);
  const display = await oauth2.afterConnect!(
    { credential: { slug: "acme", accessToken: "tok" } } as never,
    ctx,
  );
  assertEquals(display, { slug: "acme", user: { name: "Kim Possible" } });
});

Deno.test("oauth2: afterConnect degrades to just the slug when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const display = await oauth2.afterConnect!(
    { credential: { slug: "acme", accessToken: "tok" } } as never,
    ctx,
  );
  assertEquals(display, { slug: "acme" });
});

Deno.test("oauth2: declares the {slug}-templated authorize/token endpoints", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://{slug}.nationbuilder.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://{slug}.nationbuilder.com/oauth/token");
});
