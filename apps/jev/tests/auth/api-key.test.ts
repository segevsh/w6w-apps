import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: bearer method exposing a required secret `apiKey`", () => {
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field);
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer k");
});

Deno.test("api-key: test hits /v1/models; failure reports status", async () => {
  const ok = mockCtx([{ body: { models: [] } }]);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ok.ctx)).ok, true);
  assertEquals(ok.calls[0].url, "https://api.typesafe.ai/v1/models");
  const bad = mockCtx([{ status: 401, body: {} }]);
  const r = await auth.test({ credential: { apiKey: "x" } }, bad.ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("401"));
});
