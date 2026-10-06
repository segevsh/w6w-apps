import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: an apiKey method with a secret `apiKey` field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-API-KEY" });
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field);
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets X-API-KEY with no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k-1" } }, ctx);
  assertEquals(out.headers["x-api-key"], "k-1");
});

Deno.test("api-key: test GETs /me and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: "u" }, workspace: { name: "W" } } }]);
  assertEquals((await auth.test({ credential: { apiKey: "k-1" } }, ctx)).ok, true);
  assertEquals(calls[0].url, "https://api.superchat.com/v1.0/me");
  assertEquals(calls[0].headers["x-api-key"], "k-1");
});

Deno.test("api-key: test fails on the bodyless 401 and 403 the API uses for bad keys", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, headers: {} }]);
    const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
    assertEquals(result.ok, false);
    assert(result.message?.includes(String(status)));
  }
});

Deno.test("api-key: a 500 is reported as a service error, not a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 500, headers: {} }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(!result.message?.includes("rejected"));
});
