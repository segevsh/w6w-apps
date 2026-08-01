import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a body-located apiKey method with a single apiKey field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "body", name: "api_key" });
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.required, true);
  assertEquals(field.type, "secret");
});

Deno.test("api-key: sign injects api_key into an EMPTY body (e.g. account-get)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.uptimerobot.com/v2/getAccountDetails",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: "",
  };
  const out = await auth.sign!({ request, credential: { apiKey: "ur-secret-key" } }, ctx);
  const params = new URLSearchParams(out.body!);
  assertEquals(params.get("api_key"), "ur-secret-key");
  assertEquals(params.get("format"), "json");
  // The credential must never end up in a header — only in the body.
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: sign MERGES api_key into a body an action already populated", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.uptimerobot.com/v2/newMonitor",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: "friendly_name=My+Site&type=1&url=https%3A%2F%2Fexample.com",
  };
  const out = await auth.sign!({ request, credential: { apiKey: "ur-secret-key" } }, ctx);
  const params = new URLSearchParams(out.body!);
  // The action's own fields survive the merge …
  assertEquals(params.get("friendly_name"), "My Site");
  assertEquals(params.get("type"), "1");
  assertEquals(params.get("url"), "https://example.com");
  // … and the credential is appended, never overwriting them.
  assertEquals(params.get("api_key"), "ur-secret-key");
  assertEquals(params.get("format"), "json");
});

Deno.test("api-key: sign sets the form-urlencoded content-type header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.uptimerobot.com/v2/getAccountDetails",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: "",
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k" } }, ctx);
  assertEquals(out.headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("api-key: sign does not double-set format if an action already sent one", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.uptimerobot.com/v2/getMonitors",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: "format=xml",
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k" } }, ctx);
  const params = new URLSearchParams(out.body!);
  assertEquals(params.get("format"), "xml");
});

Deno.test("api-key: test POSTs api_key and format=json in the body to getAccountDetails", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { stat: "ok", account: { email: "a@b.com" } },
  }]);
  const result = await auth.test({ credential: { apiKey: "ur-secret-key" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.uptimerobot.com");
  assertEquals(url.pathname, "/v2/getAccountDetails");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  // The key must be a body field, never a header or query param.
  assertEquals(url.search, "");
  assertEquals(calls[0].headers["authorization"], undefined);
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("api_key"), "ur-secret-key");
  assertEquals(body.get("format"), "json");
});

Deno.test("api-key: test reports failure when UptimeRobot's stat is not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { stat: "fail", error: { type: "invalid_parameter", message: "api_key is invalid." } },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("invalid"));
});

Deno.test("api-key: test reports failure on an HTTP-level error", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

Deno.test("api-key: test reports failure when the field is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("apiKey"));
});
