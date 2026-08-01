import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: is a basic method with a single apiToken field", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "basic");
  const apiToken = auth.fields?.find((f) => f.key === "apiToken");
  assert(apiToken, "must declare an `apiToken` field");
  assertEquals(apiToken.required, true);
  assertEquals(apiToken.type, "secret");
});

Deno.test("api-token: sign stamps Basic base64(apiToken:api_token)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.track.toggl.com/api/v9/me",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok-abc" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok-abc:api_token")}`);
});

Deno.test("api-token: test hits GET /me with the Basic header and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await auth.test({ credential: { apiToken: "tok-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.track.toggl.com");
  assertEquals(url.pathname, "/api/v9/me");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("tok-abc:api_token")}`);
});

Deno.test("api-token: test reports failure with status code when Toggl rejects", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Invalid credentials" }]);
  const result = await auth.test({ credential: { apiToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("403"));
});

Deno.test("api-token: test reports failure when the field is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("apiToken"));
});
