import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  BASE_URL,
  compact,
  flag,
  formatFormstackError,
  FormstackClient,
  LEGACY_BASE_URL,
  truncate,
} from "../../lib/client.ts";
import { BASE, mockFormstackCtx } from "../_helpers.ts";

/**
 * V2025 and the older /api/v2 generation are different APIs with
 * non-interchangeable credentials. Pinning both here is what lets the auth
 * method name the wrong one in its error message.
 */
Deno.test("client: pins the V2025 base and keeps the legacy one for messaging only", () => {
  assertEquals(BASE_URL, BASE);
  assertEquals(BASE_URL, "https://www.formstack.com/api/v2025");
  assertEquals(LEGACY_BASE_URL, "https://www.formstack.com/api/v2");
});

Deno.test("compact: drops unset keys but keeps `false` and `0`", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

/**
 * A `json` param arrives as a string when a human typed it into the studio and
 * as a value when an upstream step produced it. Both have to work.
 */
Deno.test("asJson: accepts a parsed value or the string a user typed", () => {
  assertEquals(asJson<{ a: number }>('{"a":1}', "field"), { a: 1 });
  assertEquals(asJson<{ a: number }>({ a: 1 }, "field"), { a: 1 });
  assertEquals(asJson<number[]>("[1,2]", "field"), [1, 2]);
});

Deno.test("asJson: names the field when it is missing or malformed", () => {
  assertThrows(() => asJson(undefined, "fields"), Error, "fields is required");
  assertThrows(() => asJson("", "fields"), Error, "fields is required");
  assertThrows(() => asJson("{nope", "fields"), Error, "fields is not valid JSON");
});

Deno.test("asOptionalJson: an absent value is absent, not an error", () => {
  assertEquals(asOptionalJson(undefined, "fields"), undefined);
  assertEquals(asOptionalJson(null, "fields"), undefined);
  assertEquals(asOptionalJson("", "fields"), undefined);
  assertEquals(asOptionalJson('{"a":1}', "fields"), { a: 1 });
  assertThrows(() => asOptionalJson("{nope", "fields"), Error, "not valid JSON");
});

/** Formstack types its query flags as `"true"`/`"false"` strings, not JSON booleans. */
Deno.test("flag: renders booleans as the strings the API expects", () => {
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
  assertEquals(flag(undefined), undefined);
});

Deno.test("truncate: leaves short text alone and marks what it cut", () => {
  assertEquals(truncate("short"), "short");
  const cut = truncate("y".repeat(650));
  assert(cut.includes("650 bytes truncated"), cut);
});

/**
 * The 429 sentence is the load-bearing one: Formstack's limit is a DAILY quota
 * per token, so "retry shortly" — the reflex for a 429 — is wrong advice here.
 */
Deno.test("formatFormstackError: a 429 says the window is a day", () => {
  const msg = formatFormstackError(429, "GET", "/forms", '{"status":"error","error":"Rate limit"}');
  assert(msg.includes("daily API quota"), msg);
  assert(msg.includes("retrying"), msg);
  assert(msg.includes("will not help"), msg);
  assert(msg.includes("Rate limit"), msg);
});

Deno.test("formatFormstackError: prefers the vendor's own error text", () => {
  assertEquals(
    formatFormstackError(401, "GET", "/forms", '{"status":"error","error":"Unauthorized"}'),
    "Formstack 401 for GET /forms: Unauthorized",
  );
  assertEquals(
    formatFormstackError(400, "POST", "/forms", '{"message":"Bad request"}'),
    "Formstack 400 for POST /forms: Bad request",
  );
});

/** Validation failures carry `errors`; losing them would hide which field is wrong. */
Deno.test("formatFormstackError: serialises a validation `errors` payload", () => {
  const msg = formatFormstackError(
    422,
    "POST",
    "/forms/1/submissions",
    '{"errors":{"field_1":"required"}}',
  );
  assert(msg.includes("field_1"), msg);
  assert(msg.includes("required"), msg);
});

Deno.test("formatFormstackError: falls back to the raw body when it is not JSON", () => {
  const msg = formatFormstackError(502, "GET", "/forms", "<html>Bad Gateway</html>");
  assert(msg.includes("Bad Gateway"), msg);
});

Deno.test("client: GETs the V2025 base with a JSON accept header", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await new FormstackClient(ctx).request("/forms");
  assertEquals(calls[0].url, `${BASE}/forms`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: drops unset query params and sends no body on a GET", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: {} }]);
  await new FormstackClient(ctx).request("/forms", {
    query: { pageSize: 25, page: undefined, search: "", deleted: "false" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "25");
  assertEquals(url.searchParams.get("deleted"), "false");
  assertEquals(url.searchParams.has("page"), false);
  assertEquals(url.searchParams.has("search"), false);
  assertEquals(calls[0].body, null);
});

/**
 * Formstack defaults to url-encoded input, so JSON has to be asked for by name —
 * and submission field values are structured, so this app always asks.
 */
Deno.test("client: a body is sent as JSON with the matching content-type", async () => {
  const { ctx, calls } = mockFormstackCtx([{ status: 201, body: { id: "7" } }]);
  const result = await new FormstackClient(ctx).request<{ id: string }>("/forms/1/submissions", {
    method: "POST",
    body: { field_1: "Ada" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { field_1: "Ada" });
  assertEquals(result, { id: "7" });
});

/** A delete answers 204 with nothing to parse — a success, not a parse error. */
Deno.test("client: 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockFormstackCtx([{ status: 204 }, { body: "" }]);
  const client = new FormstackClient(ctx);
  assertEquals(await client.request("/forms/1", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/forms"), undefined);
});

Deno.test("client: a failure throws the formatted vendor error", async () => {
  const { ctx } = mockFormstackCtx([
    { status: 429, body: '{"status":"error","error":"Rate limit exceeded"}' },
  ]);
  const err = await new FormstackClient(ctx).request("/forms").catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("Formstack 429 for GET /api/v2025/forms"), err.message);
  assert(err.message.includes("daily API quota"), err.message);
});

/** Credentials belong to `sign`; the client must not add an Authorization header. */
Deno.test("client: sends no Authorization header of its own", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: {} }]);
  await new FormstackClient(ctx).request("/forms");
  assertEquals(calls[0].headers["authorization"], undefined);
});
