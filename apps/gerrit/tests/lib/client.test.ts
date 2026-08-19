import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertChangeId,
  CODE_REVIEW_MEANING,
  compact,
  csv,
  daysSince,
  describeError,
  GerritClient,
  hostFromConnection,
  json,
  MAGIC_PREFIX,
  normalizeHost,
  parseTimestamp,
  query,
  stripMagicPrefix,
} from "../../lib/client.ts";

const D = { display: { host: "https://gerrit.example.com" } };

/** The XSSI guard on every single response. */
Deno.test("stripMagicPrefix: removes Gerrit's guard and its newline", () => {
  assertEquals(MAGIC_PREFIX, ")]}'");
  assertEquals(stripMagicPrefix(')]}\'\n{"a":1}'), '{"a":1}');
  assertEquals(stripMagicPrefix(")]}'\r\n[]"), "[]");
  assertEquals(stripMagicPrefix(')]}\'"3.14.2"'), '"3.14.2"', "no newline is still stripped");
  assertEquals(stripMagicPrefix('{"a":1}'), '{"a":1}', "a body without it is unchanged");
});

Deno.test("request: strips the prefix before parsing, on every call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ')]}\'\n{"_number":42}' }], D);
  const change = await new GerritClient(ctx).request<{ _number: number }>("/changes/42");
  assertEquals(change._number, 42);
  assertEquals(calls[0].url, "https://gerrit.example.com/a/changes/42");
});

/** Everything goes under /a/, so a broken credential fails rather than reads less. */
Deno.test("request: always uses the /a/ path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ")]}'\n[]" }], D);
  await new GerritClient(ctx).request("/changes/?q=status:open");
  assert(new URL(calls[0].url).pathname.startsWith("/a/"), calls[0].url);
});

/**
 * Gerrit's timestamps have no timezone and are UTC by convention; Date.parse
 * reads them as local time.
 */
Deno.test("parseTimestamp: reads Gerrit's format as UTC, explicitly", () => {
  const at = parseTimestamp("2026-08-19 04:13:33.000000000");
  assertEquals(at?.toISOString(), "2026-08-19T04:13:33.000Z");
  assertEquals(
    parseTimestamp("2026-01-02 03:04:05.123456789")?.toISOString(),
    "2026-01-02T03:04:05.123Z",
  );
  assertEquals(parseTimestamp(""), undefined);
  assertEquals(parseTimestamp("not a date"), undefined);
});

Deno.test("daysSince: counts from a UTC-read timestamp", () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000)
    .toISOString().replace("T", " ").replace("Z", "000000");
  assertEquals(daysSince(threeDaysAgo), 3);
  assertEquals(daysSince(undefined), undefined);
});

/** A bare Change-Id is not unique across branches. */
Deno.test("assertChangeId: refuses a bare Change-Id and says why", () => {
  assertEquals(assertChangeId("620421"), "620421");
  assertEquals(assertChangeId("gerrit~620421"), "gerrit~620421");
  const err = assertThrows(
    () => assertChangeId("I7fa2d252074dccb397fb067f5c3dfbef6af3316c"),
    Error,
  );
  assert(/NOT UNIQUE/.test(err.message), err.message);
  assert(/multiple changes found/.test(err.message), err.message);
  assertThrows(() => assertChangeId(""), Error, "required");
});

Deno.test("normalizeHost and hostFromConnection handle the /a suffix", () => {
  assertEquals(normalizeHost("gerrit.example.com"), "https://gerrit.example.com");
  assertEquals(normalizeHost("https://gerrit.example.com/a"), "https://gerrit.example.com");
  assertEquals(normalizeHost("https://gerrit.example.com/"), "https://gerrit.example.com");
  assertEquals(hostFromConnection(D), "https://gerrit.example.com");
  const err = assertThrows(() => hostFromConnection({ display: {} }), Error);
  assert(/software people run/.test(err.message), err.message);
});

Deno.test("CODE_REVIEW_MEANING explains that the scale is not additive", () => {
  assert(/veto/.test(CODE_REVIEW_MEANING["-2"]));
  assert(/somebody else must approve/.test(CODE_REVIEW_MEANING["+1"]));
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** Gerrit's 401 body is HTML, not a message. */
Deno.test("describeError: a 401 names the HTTP password and the HTML body", () => {
  const message = describeError(401, "<html><title>Error 401</title></html>");
  assert(/HTTP password/.test(message), message);
  assert(/not the account's login password/.test(message), message);
});

Deno.test("describeError: a 403 names per-project and per-ref permissions", () => {
  assert(/per project and per ref/.test(describeError(403, "Forbidden")));
});

Deno.test("describeError: a 404 says invisible and missing are the same answer", () => {
  assert(/absent rather than forbidden/.test(describeError(404, "Not found")));
});

Deno.test("describeError: a 409 names the submit failure modes", () => {
  assert(/submit requirements are unmet/.test(describeError(409, "cannot merge")));
});

/** Error bodies carry the prefix too. */
Deno.test("describeError: strips the magic prefix from an error body", () => {
  assertEquals(describeError(400, ")]}'\nbad request"), "bad request");
});

Deno.test("request: an unparseable body names the magic prefix", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>login</html>" }], D);
  let message = "";
  try {
    await new GerritClient(ctx).request("/changes/1");
  } catch (err) {
    message = String(err);
  }
  assert(/magic prefix/.test(message), message);
});
