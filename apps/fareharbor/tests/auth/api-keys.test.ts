import { assert, assertEquals } from "@std/assert";
import apiKeys from "../../auth/api-keys.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const cred = { appKey: "app-uuid", userKey: "user-uuid" };
const test = (credential: unknown, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  apiKeys.test!({ credential } as never, ctx);

Deno.test("api-keys: sign stamps both headers and nothing else", () => {
  const request = { url: "https://fareharbor.com/api/external/v1/companies/", headers: {} } as {
    url: string;
    headers: Record<string, string>;
  };
  const signed = apiKeys.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers, {
    "X-FareHarbor-API-App": "app-uuid",
    "X-FareHarbor-API-User": "user-uuid",
  });
  assert(!signed.url.includes("app-uuid"), "key must not enter the URL");
});

Deno.test("api-keys: both key fields are secrets", () => {
  assertEquals(apiKeys.fields!.map((f) => [f.key, f.type]), [["appKey", "secret"], [
    "userKey",
    "secret",
  ]]);
});

Deno.test("api-keys: test probes GET /companies/ with both headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { companies: [] } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/");
  assertEquals(calls[0].headers["x-fareharbor-api-app"], "app-uuid");
  assertEquals(calls[0].headers["x-fareharbor-api-user"], "user-uuid");
});

Deno.test("api-keys: a missing key short-circuits without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await test({ appKey: "a", userKey: " " }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-keys: verdicts follow the body code, not the status", async () => {
  const cases: Array<[number, string, string, RegExp]> = [
    [400, "key-missing", "keys required", /received no keys/],
    [403, "app-key-invalid", "API app key is invalid", /App key/],
    [403, "app-invalid", "Invalid application", /App key/],
    [403, "user-key-invalid", "API user key is invalid", /User key/],
  ];
  for (const [status, code, text, re] of cases) {
    const { ctx } = mockCtx([{ status, body: errorBody(status, code, text) }]);
    const r = await test(cred, ctx);
    assertEquals(r.ok, false, code);
    assert(re.test(r.message ?? ""), `${code}: ${r.message}`);
  }
});

Deno.test("api-keys: a 403 or 429 that is not a key code reads as possible rate limiting", async () => {
  for (const status of [403, 429]) {
    const { ctx } = mockCtx([{ status, body: errorBody(status, "throttled", "slow down") }]);
    const r = await test(cred, ctx);
    assertEquals(r.ok, false);
    assert(/rate limiting/.test(r.message ?? ""), r.message);
  }
});

Deno.test("api-keys: an unexpected status is reported with the path", async () => {
  const { ctx } = mockCtx([{ status: 504, body: "gateway", headers: {} }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("504"));
});
