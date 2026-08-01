import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method with a single apiKey field, header-located", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-Api-Key");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.required, true);
  assertEquals(field.type, "secret");
});

Deno.test("api-key: sign stamps X-Api-Key with no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.clockify.me/api/v1/workspaces",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(out.headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test hits GET /workspaces with the header and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.clockify.me");
  assertEquals(url.pathname, "/api/v1/workspaces");
  assertEquals(calls[0].headers["x-api-key"], "key-abc");
});

Deno.test("api-key: test reports failure with status code when Clockify rejects", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Multiple or none auth tokens present" },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("api-key: test reports failure when the field is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("apiKey"));
});
