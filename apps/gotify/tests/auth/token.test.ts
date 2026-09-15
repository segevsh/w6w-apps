import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import token from "../../auth/token.ts";

Deno.test("token: sign() stamps X-Gotify-Key, not Authorization", () => {
  const request = {
    url: "https://gotify.example.com/message",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const signed = token.sign!({ request, credential: { token: "ctok.abc" } }, mockCtx().ctx);
  assertEquals((signed as typeof request).headers["x-gotify-key"], "ctok.abc");
  assertEquals((signed as typeof request).headers["authorization"], undefined);
});

Deno.test("token: test() succeeds against GET /current/user", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "admin", admin: true } }]);
  const result = await token.test(
    { credential: { token: "ctok.abc", baseUrl: "gotify.example.com" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://gotify.example.com/current/user");
  assertEquals(calls[0].headers["x-gotify-key"], "ctok.abc");
});

Deno.test("token: test() names the client-vs-application-token trap on 401", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized", errorCode: 401, errorDescription: "invalid access token" },
  }]);
  const result = await token.test(
    { credential: { token: "atok.bad", baseUrl: "https://gotify.example.com" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("CLIENT token"), true, result.message);
});

Deno.test("token: test() reports a bad instance URL as 404, not a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await token.test(
    { credential: { token: "ctok.abc", baseUrl: "https://not-gotify.example.com" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("404"), true, result.message);
});

Deno.test("token: test() rejects a missing token or baseUrl before any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  const noToken = await token.test({ credential: { baseUrl: "https://gotify.example.com" } }, ctx);
  assertEquals(noToken.ok, false);
  const noUrl = await token.test({ credential: { token: "ctok.abc" } }, ctx);
  assertEquals(noUrl.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records the account name and instance, never the token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 1, name: "admin", admin: true } }]);
  const display = await token.afterConnect!(
    { credential: { token: "ctok.abc", baseUrl: "gotify.example.com" } },
    ctx,
  );
  assertEquals(display.name, "admin");
  assertEquals(display.admin, true);
  assertEquals(display.baseUrl, "https://gotify.example.com");
  assertEquals(JSON.stringify(display).includes("ctok.abc"), false);
});
