import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares a header-located apiKey method named X-Postmark-Server-Token", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-Postmark-Server-Token");
  const field = auth.fields?.find((f) => f.key === "serverToken");
  assert(field, "must declare a `serverToken` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets the X-Postmark-Server-Token header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.postmarkapp.com/server",
    method: "GET" as const,
    headers: {} as Record<string, string>,
    body: null as string | null,
  };
  const out = await auth.sign!({ request, credential: { serverToken: "pm-abc123" } }, ctx);
  assertEquals(out.headers["x-postmark-server-token"], "pm-abc123");
});

Deno.test("api-key: test with missing serverToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("serverToken"), "message should mention serverToken");
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test GETs /server with the token header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ID: 1, Name: "My Server" } }]);
  const result = await auth.test({ credential: { serverToken: "pm-abc123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.postmarkapp.com");
  assertEquals(url.pathname, "/server");
  assertEquals(calls[0].headers["x-postmark-server-token"], "pm-abc123");
});

Deno.test("api-key: test surfaces the vendor's Message on a non-2xx", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { ErrorCode: 10, Message: "Invalid API key" },
  }]);
  const result = await auth.test({ credential: { serverToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Invalid API key");
});

Deno.test("api-key: afterConnect returns the server record for the connection label", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ID: 1, Name: "My Server" } }]);
  const out = await auth.afterConnect!({ credential: { serverToken: "pm-abc123" } }, ctx);
  assertEquals(out, { server: { ID: 1, Name: "My Server" } });
});
