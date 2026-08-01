import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "jwt-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer jwt-abc");
});

Deno.test("api-key: test hits /v1/emails/operations and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { operations: [] } }]);
  const result = await auth.test({ credential: { apiKey: "jwt-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mailcheck.co");
  assertEquals(url.pathname, "/v1/emails/operations");
  assertEquals(url.searchParams.get("page_size"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer jwt-abc");
});

Deno.test("api-key: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "JWT validation failed: Missing or invalid credentials" },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});
