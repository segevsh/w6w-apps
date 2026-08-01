import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method carrying the token as a query param", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "token" });
  const field = auth.fields?.find((f) => f.key === "token");
  assert(field, "must declare a `token` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends token to the query string, not a header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://onesimpleapi.com/api/qr_code?message=hi",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "tok-abc" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("token"), "tok-abc");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: test hits exchange_rate?to_currency=USD and reports ok on JSON 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { to_value: 1 } }]);
  const result = await auth.test({ credential: { token: "tok-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://onesimpleapi.com");
  assertEquals(url.pathname, "/api/exchange_rate");
  assertEquals(url.searchParams.get("to_currency"), "USD");
  assertEquals(url.searchParams.get("token"), "tok-abc");
});

Deno.test("api-key: test reports failure when the API redirects to /login (invalid token quirk)", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: "<!DOCTYPE html><title>Redirecting to /login</title>",
      headers: { "content-type": "text/html; charset=UTF-8" },
    },
  ]);
  const result = await auth.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("JSON"));
});

Deno.test("api-key: test reports failure with status code on a JSON error response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "unauthorized" } }]);
  const result = await auth.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("api-key: test reports failure when the credential is missing a token", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
