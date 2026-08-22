import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DEFAULT_PORT,
  describeError,
  hostFromConnection,
  json,
  normalizeHost,
  parseImportResult,
  query,
  TypesenseClient,
} from "../../lib/client.ts";

const D = { display: { host: "https://search.internal:8108" } };

/** A bare hostname is self-hosted and listens on 8108; Cloud serves on 443. */
Deno.test("normalizeHost: adds 8108 to a bare hostname and leaves a URL alone", () => {
  assertEquals(DEFAULT_PORT, 8108);
  assertEquals(normalizeHost("search.internal"), "https://search.internal:8108");
  assertEquals(normalizeHost("https://xyz.a1.typesense.net"), "https://xyz.a1.typesense.net");
  assertEquals(normalizeHost("http://localhost:8108"), "http://localhost:8108");
  assertEquals(normalizeHost("https://search.internal/"), "https://search.internal");
  assertThrows(() => normalizeHost(""), Error, "required");
});

Deno.test("hostFromConnection: says to reconnect when no host is recorded", () => {
  assertEquals(hostFromConnection({ display: { host: "https://x:8108" } }), "https://x:8108");
  const err = assertThrows(() => hostFromConnection({ display: {} }), Error);
  assert(/its own server/.test(err.message), err.message);
});

/** The credential is a header, and the client never sets it. */
Deno.test("request: builds the path and sets no key header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await new TypesenseClient(ctx).request("/collections");
  assertEquals(calls[0].url, "https://search.internal:8108/collections");
  assertEquals(calls[0].headers["x-typesense-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Import and export speak JSONL, not JSON. */
Deno.test("request: jsonl bodies go out as text/plain, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '{"success":true}' }], D);
  await new TypesenseClient(ctx).request("/collections/x/documents/import", {
    method: "POST",
    jsonl: '{"id":"1"}\n{"id":"2"}',
    text: true,
  });
  assertEquals(calls[0].headers["content-type"], "text/plain");
  assertEquals(calls[0].body, '{"id":"1"}\n{"id":"2"}');
});

/**
 * The trap this app exists to handle: a 200 whose body says every document
 * failed.
 */
Deno.test("parseImportResult: reads each line and separates the failures", () => {
  const body = [
    '{"success": true}',
    '{"success": false, "error": "Bad JSON.", "document": "[bad doc"}',
    '{"success": true}',
    "",
  ].join("\n");
  const result = parseImportResult(body);
  assertEquals(result.lines.length, 3);
  assertEquals(result.succeeded, 2);
  assertEquals(result.failed.length, 1);
  assertEquals(result.failed[0].error, "Bad JSON.");
});

/** A line that is not JSON must not be silently counted as a success. */
Deno.test("parseImportResult: an unparseable line counts as a failure", () => {
  const result = parseImportResult('{"success": true}\nnot json at all');
  assertEquals(result.succeeded, 1);
  assertEquals(result.failed.length, 1);
  assert(/unparseable/.test(result.failed[0].error!), result.failed[0].error);
});

Deno.test("parseImportResult: an empty body is no lines rather than a crash", () => {
  const result = parseImportResult("");
  assertEquals(result.lines, []);
  assertEquals(result.succeeded, 0);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("name, description"), ["name", "description"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 0, c: "", d: false }), { a: "x", b: 0, d: false });
});

Deno.test("describeError: a 401 names the header, not a bearer token", () => {
  const message = describeError(401, JSON.stringify({ message: "Forbidden" }));
  assert(/X-TYPESENSE-API-KEY/.test(message), message);
  assert(/scoped search key/.test(message), message);
});

/** There is no create-or-update on a collection. */
Deno.test("describeError: a 409 explains the alias swap", () => {
  const message = describeError(409, JSON.stringify({ message: "already exists" }));
  assert(/swapped in with an alias/.test(message), message);
});

Deno.test("describeError: a 422 names the schema and the catch-all", () => {
  const message = describeError(422, JSON.stringify({ message: "Field `price` must be a float" }));
  assert(/`\.\*` catch-all/.test(message), message);
});

Deno.test("describeError: a 503 points at the health endpoint's resource errors", () => {
  assert(/OUT_OF_DISK/.test(describeError(503, "{}")));
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }], D);
  let message = "";
  try {
    await new TypesenseClient(ctx).request("/collections/nope");
  } catch (err) {
    message = String(err);
  }
  assert(/Typesense 404 for GET \/collections\/nope/.test(message), message);
  assert(/case-sensitive/.test(message), message);
});
