import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  apiBase,
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  formatIroncladError,
  IroncladClient,
  normalizeRegion,
  oauthBase,
  regionFromConnection,
  toList,
  truncate,
} from "../../lib/client.ts";
import { asUserHeaders, displayFrom } from "../../auth/credential.ts";
import { mockCtx, mockCtxWithRegion } from "../_helpers.ts";

Deno.test("regions: unknown or missing values mean US production", () => {
  assertEquals(normalizeRegion("eu1"), "eu1");
  assertEquals(normalizeRegion("na1"), "us");
  assertEquals(normalizeRegion(undefined), "us");
  assertEquals(apiBase("demo"), "https://demo.ironcladapp.com/public/api/v1");
  assertEquals(oauthBase("eu1"), "https://eu1.ironcladapp.com/oauth");
  assertEquals(regionFromConnection(undefined), "us");
});

Deno.test("compact: keeps false and 0, drops unset, empty and empty arrays", () => {
  assertEquals(compact({ a: false, b: 0, c: undefined, d: null, e: "", f: [], g: [1] }), {
    a: false,
    b: 0,
    g: [1],
  });
});

Deno.test("json helpers: parse strings, pass objects, reject bad JSON", () => {
  assertEquals(asOptionalJson("", "x"), undefined);
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  assertThrows(() => asJson("", "x"), Error, "x is required");
  assertThrows(() => asOptionalJson("{", "x"), Error, "x is not valid JSON");
});

Deno.test("toList and encodeId", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList([]), undefined);
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertThrows(() => encodeId("  "), Error, "an id is required");
  assert(truncate("x".repeat(700)).length < 700);
});

Deno.test("formatIroncladError: keeps code, param and message; 429 mentions Retry-After", () => {
  const msg = formatIroncladError(
    429,
    "GET",
    "/workflows",
    '{"code":"RATE_LIMIT","message":"slow"}',
    "12",
  );
  assert(msg.includes("RATE_LIMIT") && msg.includes("retry after 12s"));
  assert(formatIroncladError(500, "GET", "/x", "<html>boom</html>").includes("boom"));
});

Deno.test("client: sends JSON bodies with a content type and comma-joins array queries", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new IroncladClient(ctx).json("/x", {
    method: "POST",
    query: { s: ["a", "b"] },
    body: { a: 1 },
  });
  assertEquals(calls[0].url, "https://ironcladapp.com/public/api/v1/x?s=a%2Cb");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: never adds credentials itself — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new IroncladClient(ctx).json("/x");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: follows the connection's region", async () => {
  const { ctx, calls } = mockCtxWithRegion("demo", [{ body: {} }]);
  await new IroncladClient(ctx).json("/x");
  assert(calls[0].url.startsWith("https://demo.ironcladapp.com/public/api/v1/x"));
});

Deno.test("client: 204 resolves to undefined and an error status throws a coded message", async () => {
  const a = mockCtx([{ status: 204 }]);
  assertEquals(await new IroncladClient(a.ctx).json("/x", { method: "DELETE" }), undefined);
  const b = mockCtx([{
    status: 401,
    body: { code: "UNAUTHORIZED", message: "invalid authentication token" },
  }]);
  await assertRejects(
    async () => await new IroncladClient(b.ctx).json("/x"),
    Error,
    "UNAUTHORIZED",
  );
});

Deno.test("credential helpers", () => {
  assertEquals(asUserHeaders(" a@b.co "), { "x-as-user-email": "a@b.co" });
  assertEquals(asUserHeaders("u1"), { "x-as-user-id": "u1" });
  assertEquals(asUserHeaders(undefined), {});
  assertEquals(displayFrom("us", undefined).companyName, undefined);
});
