import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-API-KEY" });
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets X-API-KEY using credential.apiKey, no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(out.headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test hits /v2/list-templates?limit=1 and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success", templates: [] } }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://rest.apitemplate.io");
  assertEquals(url.pathname, "/v2/list-templates");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "error", message: "Unauthorized" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
