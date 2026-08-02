import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares a body-located apiKey method named `key`", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "body");
  assertEquals(auth.apiKey?.name, "key");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign merges `key` into an empty JSON body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://mandrillapp.com/api/1.0/users/ping.json",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: null as string | null,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "md-abc123" } }, ctx);
  assertEquals(JSON.parse(out.body!), { key: "md-abc123" });
  assertEquals(out.headers["content-type"], "application/json");
});

Deno.test("api-key: sign merges `key` on top of an action's existing JSON body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://mandrillapp.com/api/1.0/tags/info.json",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify({ tag: "welcome" }),
  };
  const out = await auth.sign!({ request, credential: { apiKey: "md-abc123" } }, ctx);
  assertEquals(JSON.parse(out.body!), { tag: "welcome", key: "md-abc123" });
});

Deno.test("api-key: test with missing apiKey reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"), "message should mention apiKey");
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test POSTs /users/ping.json with the key in the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "PONG!" }]);
  const result = await auth.test({ credential: { apiKey: "md-abc123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "mandrillapp.com");
  assertEquals(url.pathname, "/api/1.0/users/ping.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { key: "md-abc123" });
});

Deno.test("api-key: test surfaces the vendor's error message on a 500", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { status: "error", code: -1, name: "Invalid_Key", message: "Invalid API key" },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Invalid API key");
});
