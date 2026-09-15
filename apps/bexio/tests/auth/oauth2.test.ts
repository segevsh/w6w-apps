import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2.sign: injects Bearer authorization and accept headers, nothing else", async () => {
  const request = {
    headers: {} as Record<string, string>,
    url: "https://api.bexio.com/2.0/contact",
  };
  const result = await auth.sign!({
    request,
    credential: { accessToken: "tok_123" },
  } as never, {} as never);
  assertEquals(result.headers["authorization"], "Bearer tok_123");
  assertEquals(result.headers["accept"], "application/json");
});

Deno.test("oauth2.test: ok when company_profile returns a non-empty array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Acme AG" }] }]);
  const result = await auth.test!({ credential: { accessToken: "tok_123" } } as never, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/company_profile");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
});

Deno.test("oauth2.test: fails without echoing the token, reading the vendor's own error body", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error_code: 16, message: "invalid_token" } },
  ]);
  const result = await auth.test!({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "invalid_token");
  assertEquals(result.message?.includes("bad"), false);
});

Deno.test("oauth2.test: fails cleanly when no accessToken is present", async () => {
  const { ctx } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2.afterConnect: derives the connection label from the company profile", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1, name: "Acme AG" }] }]);
  const result = await auth.afterConnect!({} as never, ctx);
  assertEquals(result, { company: { id: 1, name: "Acme AG" } });
});
