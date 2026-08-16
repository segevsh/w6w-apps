import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method with a header of x-goog-api-key", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "x-goog-api-key");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets x-goog-api-key from credential.apiKey, not Authorization", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "AIza-test" } }, ctx);
  assertEquals(out.headers["x-goog-api-key"], "AIza-test");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: test hits /v1beta/models with the key header and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { models: [] } }]);
  const result = await auth.test({ credential: { apiKey: "AIza-test" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models");
  assertEquals(calls[0].headers["x-goog-api-key"], "AIza-test");
});

Deno.test("api-key: test with missing apiKey reports the failure without hitting network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reads the vendor's own error message, not just the status", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: {
        error: { code: 400, message: "API key not valid.", status: "INVALID_ARGUMENT" },
      },
    },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "API key not valid.");
});

Deno.test("api-key: test falls back to the status when the body carries no error message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("403"));
});
