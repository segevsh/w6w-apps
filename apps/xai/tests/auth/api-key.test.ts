import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { classify } from "../../auth/api-key.ts";

Deno.test("api-key: bearer method exposing a required `apiKey` secret", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field);
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign stamps the Bearer header", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "xai-abc" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "Bearer xai-abc");
});

Deno.test("api-key: test probes GET /v1/models (never /v1/api-key) and passes on a model list", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [{ id: "grok-x" }] } }]);
  const result = await auth.test({ credential: { apiKey: "xai-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/models");
  assertEquals(calls[0].headers["authorization"], "Bearer xai-abc");
});

Deno.test("api-key: a wrong key (400 invalid-argument, measured live) is a failed credential", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "invalid-argument",
      error: "Incorrect API key provided. You can obtain an API key from https://console.x.ai.",
    },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("rejected"));
});

Deno.test("api-key: classify reads the body, not the status", () => {
  assertEquals(
    classify({ code: "unauthenticated:no-credentials", error: "No credentials presented." }).ok,
    false,
  );
  assertEquals(classify({ data: [] }).ok, true);
  assert(classify({ code: "internal", error: "boom" }).message?.includes("unexpected"));
  assertEquals(classify(null).ok, false);
});

Deno.test("api-key: a non-JSON reply fails rather than throwing", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await auth.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
});
