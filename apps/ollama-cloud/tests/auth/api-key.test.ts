import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "../actions/_shared.ts";

test("auth: bearer, one required secret field, and the key page in the hint", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const fields = auth.fields as Array<{ key: string; type: string; required?: boolean }>;
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assertEquals(fields[0].required, true);
  assertEquals(fields[0].type, "secret");
});

test("auth: sign puts the key on the request as a bearer token", () => {
  const request = { url: `${BASE}/api/tags`, headers: {} as Record<string, string> };
  const signed = auth.sign!({
    request,
    credential: { apiKey: "sk-secret" },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "Bearer sk-secret");
});

test("auth: the connection test proves the key against /api/tags", async () => {
  const { ctx, calls } = mockCtx([ok({ models: [] })]);
  const result = await auth.test!({ credential: { apiKey: "sk-secret" } } as never, ctx);
  assertEquals(calls[0].url, `${BASE}/api/tags`);
  assertEquals(calls[0].headers["authorization"], "Bearer sk-secret");
  assertEquals(result.ok, true);
});

test("auth: a blank key is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

test("auth: a rejected key and an unreachable host are different messages", async () => {
  const rejected = await auth.test!(
    { credential: { apiKey: "sk-bad" } } as never,
    mockCtx([{ status: 401, body: { error: "unauthorized" } }]).ctx,
  );
  assertEquals(rejected.ok, false);
  assertEquals(/settings\/keys/.test(rejected.message!), true, rejected.message);

  const { ctx } = mockCtx([]);
  const offline = await auth.test!(
    { credential: { apiKey: "sk-x" } } as never,
    { ...ctx, fetch: () => Promise.reject(new Error("dns")) },
  );
  assertEquals(offline.ok, false);
  assertEquals(/could not reach Ollama Cloud/.test(offline.message!), true, offline.message);
});
