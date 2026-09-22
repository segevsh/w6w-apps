import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  formatPracticeBetterError,
  pageParams,
  pageQuery,
  PracticeBetterClient,
  readErrorBody,
  TOKEN_URL,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and token URLs are the document's single server", () => {
  assertEquals(API_BASE, "https://api.practicebetter.io");
  assertEquals(TOKEN_URL, "https://api.practicebetter.io/oauth2/token");
});

Deno.test("client: request() parses JSON and passes the body through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec-1", isActive: true } }]);
  const body = await new PracticeBetterClient(ctx).request<Record<string, unknown>>(
    "/consultant/records/x",
  );
  assertEquals(body, { id: "rec-1", isActive: true });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: a JSON body is serialized with a JSON content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new PracticeBetterClient(ctx).request("/tags", { method: "POST", body: { name: "VIP" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"VIP"}');
});

Deno.test("client: a 204 and an empty body both resolve to undefined", async () => {
  const empty = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new PracticeBetterClient(empty.ctx).request("/x"), undefined);

  const blank = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new PracticeBetterClient(blank.ctx).request("/x"), undefined);
});

Deno.test("client: a non-JSON success body is a loud error, not silently undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  await assertRejects(
    async () => await new PracticeBetterClient(ctx).request("/x"),
    Error,
    "did not return JSON",
  );
});

Deno.test("client: list() returns the envelope verbatim rather than unwrapping items", async () => {
  const envelope = { count: 128, hasMore: true, items: [{ id: "a" }] };
  const { ctx } = mockCtx([{ body: envelope }]);
  assertEquals(await new PracticeBetterClient(ctx).list("/consultant/records"), envelope);
});

Deno.test("client: status() reports the code without reading the body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new PracticeBetterClient(ctx).status("/tags/1", { method: "DELETE" }), 204);
});

Deno.test("client: array query values are sent as repeated keys, the OpenAPI 3 default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PracticeBetterClient(ctx).request("/consultant/records", {
    query: { status: ["active", "archived"], limit: 10, flag: false },
  });
  const all = queryAllOf(calls[0].url);
  assertEquals(all.status, ["active", "archived"]);
  assertEquals(queryOf(calls[0].url).limit, "10");
  assertEquals(queryOf(calls[0].url).flag, "false");
});

Deno.test("client: empty, null and undefined query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PracticeBetterClient(ctx).request("/x", {
    query: { a: undefined, b: null, c: "", d: "kept" },
  });
  assertEquals(new URL(calls[0].url).search, "?d=kept");
});

Deno.test("client: a non-2xx throws with the status, method and path", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Not permitted." } }]);
  const err = await assertRejects(
    async () =>
      await new PracticeBetterClient(ctx).request("/consultant/records", { method: "POST" }),
    Error,
  ) as Error;
  assert(/HTTP 403/.test(err.message), err.message);
  assert(/POST \/consultant\/records/.test(err.message), err.message);
  assert(/Not permitted\./.test(err.message), err.message);
});

Deno.test("client: pageQuery drops unset controls but keeps zero and false-ish values", () => {
  assertEquals(pageQuery({}), {});
  assertEquals(pageQuery({ skip: 0, limit: 100 }), { skip: 0, limit: 100 });
  assertEquals(pageQuery({ after_id: "" }), {});
});

Deno.test("client: the four pagination params are declared once, with the documented limit range", () => {
  assertEquals(pageParams.map((p) => p.key), ["after_id", "before_id", "limit", "skip"]);
  const limit = pageParams.find((p) => p.key === "limit")!;
  assertEquals(limit.type, "number");
  assertEquals(limit.validation, { integer: true, min: 1, max: 100 });
  for (const param of pageParams) {
    assertEquals(param.required, undefined, `${param.key} must stay optional`);
  }
});

Deno.test("client: compact keeps false and zero, drops unset", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("client: toList normalises arrays, comma strings and empties", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: JSON params accept both a parsed value and the text a user typed", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  let message = "";
  try {
    asJson("{nope", "profile");
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message, "profile is not valid JSON");
  message = "";
  try {
    asJson("", "profile");
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message, "profile is required");
});

Deno.test("client: encodeId neutralises path metacharacters and trims", () => {
  assertEquals(encodeId(" rec-1 "), "rec-1");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("client: truncate keeps a long validation body readable", () => {
  assertEquals(truncate("short", 10), "short");
  const long = truncate("x".repeat(50), 10);
  assert(long.startsWith("xxxxxxxxxx…"), long);
  assert(/\(50 bytes truncated\)/.test(long), long);
});

/**
 * The document declares NO error envelope, so these assertions are about the
 * defensive read: several plausible shapes in, a usable sentence out, and never
 * a fabricated one.
 */
Deno.test("client: readErrorBody reads a JSON message, a raw body, and nothing", () => {
  assertEquals(readErrorBody('{"message":"Duplicate record."}').detail, "Duplicate record.");
  assertEquals(readErrorBody('{"error":{"message":"Nested."}}').detail, "Nested.");
  assertEquals(readErrorBody("plain text refusal").detail, "plain text refusal");
  assertEquals(readErrorBody("").detail, "");
  assertEquals(readErrorBody("[1,2,3]").detail, "[1,2,3]");
});

Deno.test("client: readErrorBody reads the one documented error schema if it appears", () => {
  // `ExternalApiError` describes a third-party system's error relayed by
  // Practice Better, not one of its own bodies — but its message and code are
  // read when present rather than thrown away.
  const detail = readErrorBody(
    '{"externalErrorCode":"CLAIM_MD_DOWN","message":"Claim.MD is unavailable.","source":"claimmd","statusCode":502}',
  );
  assertEquals(detail.detail, "Claim.MD is unavailable.");
  assertEquals(detail.code, "CLAIM_MD_DOWN");
});

Deno.test("client: formatPracticeBetterError names the status first and hints at recoverable ones", () => {
  const conflict = formatPracticeBetterError(409, "POST", "/consultant/records", "");
  assert(
    conflict.startsWith("Practice Better returned HTTP 409 for POST /consultant/records"),
    conflict,
  );
  assert(/conflict/.test(conflict), conflict);
  const limited = formatPracticeBetterError(429, "GET", "/tags", "");
  assert(/rate limited/.test(limited), limited);
  const plain = formatPracticeBetterError(500, "GET", "/tags", "");
  assert(!/conflict|rate limited/.test(plain), plain);
});
