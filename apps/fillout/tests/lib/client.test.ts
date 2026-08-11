import { assert, assertEquals, assertThrows } from "@std/assert";
import type { RedactedConnection } from "@w6w/types";
import {
  apiHost,
  asJson,
  baseUrl,
  classifyCredentialMessage,
  compact,
  credentialAdvice,
  encodeId,
  formatFilloutError,
  formatIssues,
  parseIssues,
  regionFromConnection,
  truncate,
} from "../../lib/client.ts";
import { errorBody, EU_ROOT, US_ROOT } from "../_helpers.ts";

const conn = (display: Record<string, unknown> | undefined): RedactedConnection =>
  ({
    id: "c",
    app: "io.w6w.fillout",
    auth: "api-key",
    owner: "u",
    state: "connected",
    createdAt: "2026-08-11T00:00:00.000Z",
    display,
  }) as RedactedConnection;

// --- region routing ---------------------------------------------------------

Deno.test("client: both documented servers are reachable and nothing else is", () => {
  assertEquals(apiHost("us"), "api.fillout.com");
  assertEquals(apiHost("eu"), "eu-api.fillout.com");
  assertEquals(baseUrl(conn({ region: "us" })), US_ROOT);
  assertEquals(baseUrl(conn({ region: "eu" })), EU_ROOT);
});

/**
 * A Connection with no display data at all is the case a health check hits
 * before `afterConnect` has ever run. Defaulting to US is the vendor's own
 * "typical" answer; throwing or building `https://undefined…` would not be.
 */
Deno.test("client: an absent or unknown region falls back to the US host", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection(conn(undefined)), "us");
  assertEquals(regionFromConnection(conn({})), "us");
  assertEquals(regionFromConnection(conn({ region: "apac" })), "us");
  assertEquals(regionFromConnection(conn({ region: "eu" })), "eu");
});

// --- small helpers ----------------------------------------------------------

Deno.test("client: compact drops unset values but keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }),
    { a: 1, e: 0, f: false },
  );
});

Deno.test("client: encodeId neutralises path separators", () => {
  assertEquals(encodeId(" aB1 "), "aB1");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a?b#c"), "a%3Fb%23c");
});

Deno.test("client: asJson accepts a parsed value or the string a user typed", () => {
  assertEquals(asJson<number[]>([1, 2], "X"), [1, 2]);
  assertEquals(asJson<number[]>("[1,2]", "X"), [1, 2]);
  assertThrows(() => asJson("{nope", "X"), Error, "X is not valid JSON");
  assertThrows(() => asJson("", "X"), Error, "X is required");
});

Deno.test("client: truncate keeps short text and marks what it cut", () => {
  assertEquals(truncate("abc", 10), "abc");
  assert(truncate("x".repeat(50), 10).startsWith("x".repeat(10)));
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

// --- the credential taxonomy ------------------------------------------------

/**
 * Every row is a message recorded live on 2026-08-11 from
 * `GET https://api.fillout.com/v1/api/forms`, and every one arrived as a **400**.
 * The classification therefore cannot come from the status code — this table is
 * the whole of the available signal.
 */
Deno.test("client: the measured error prose maps to the right verdict", () => {
  assertEquals(classifyCredentialMessage("API authorization header missing"), "missing");
  // Differs from the row above by one capital letter. Both must land in the
  // same bucket — the casing is not a contract anyone wrote down.
  assertEquals(classifyCredentialMessage("API Authorization header missing"), "missing");
  assertEquals(classifyCredentialMessage("API key missing underscore"), "malformed");
  assertEquals(classifyCredentialMessage("API Key invalid"), "rejected");
});

Deno.test("client: anything else is 'other', including non-strings and prose about other things", () => {
  assertEquals(classifyCredentialMessage("Too many requests. Try again soon."), "other");
  assertEquals(classifyCredentialMessage("Not Found"), "other");
  assertEquals(classifyCredentialMessage(undefined), "other");
  assertEquals(classifyCredentialMessage(42), "other");
  assertEquals(classifyCredentialMessage(["API Key invalid"]), "other");
});

Deno.test("client: each verdict has its own advice, so the classification is not decorative", () => {
  const advice = (["missing", "malformed", "rejected", "other"] as const).map(credentialAdvice);
  assertEquals(new Set(advice).size, 4, advice.join(" | "));
});

// --- the Zod issue form -----------------------------------------------------

/**
 * `POST /v1/api/forms/{formId}/submissions` answers a 400 whose `message` is a
 * **stringified** JSON array of Zod issues, measured 2026-08-11 with body `{}`.
 */
const REAL_ZOD_MESSAGE =
  '[\n  {\n    "expected": "array",\n    "code": "invalid_type",\n    "path": [\n      "submissions"\n    ],\n    "message": "Invalid input: expected array, received undefined"\n  }\n]';

Deno.test("client: parseIssues reads the real stringified issue array", () => {
  const issues = parseIssues(REAL_ZOD_MESSAGE);
  assertEquals(issues?.length, 1);
  assertEquals(issues?.[0].path, ["submissions"]);
  assertEquals(
    formatIssues(issues!),
    "submissions: Invalid input: expected array, received undefined",
  );
});

Deno.test("client: parseIssues leaves prose alone", () => {
  assertEquals(parseIssues("API Key invalid"), undefined);
  assertEquals(parseIssues("[not json"), undefined);
  assertEquals(parseIssues(undefined), undefined);
  assertEquals(parseIssues('{"a":1}'), undefined);
});

Deno.test("client: an issue with no path is labelled rather than dropped", () => {
  assertEquals(formatIssues([{ message: "bad" }]), "(body): bad");
  assertEquals(formatIssues([{ code: "custom" }]), "(body): custom");
});

// --- error formatting -------------------------------------------------------

/**
 * The pivotal case: a 400 that is about the *body*, on a route that also
 * answers 400 for every credential failure. It must not be dressed up as an
 * auth problem.
 */
Deno.test("client: a body-validation 400 reads as a body problem", () => {
  const msg = formatFilloutError(
    400,
    "POST",
    "/v1/api/forms/aB1/submissions",
    errorBody(400, "Bad Request", REAL_ZOD_MESSAGE),
  );
  assert(msg.includes("request body rejected"), msg);
  assert(msg.includes("submissions: Invalid input"), msg);
  assert(!/api key|reconnect|revoked|underscore/i.test(msg), msg);
});

Deno.test("client: a credential 400 carries the vendor sentence and the advice", () => {
  const msg = formatFilloutError(
    400,
    "GET",
    "/v1/api/forms",
    errorBody(400, "Bad Request", "API authorization header missing"),
  );
  assert(msg.includes("API authorization header missing"), msg);
  assert(msg.includes("no usable Bearer credential"), msg);
});

Deno.test("client: a 429 names the ceiling that caused it", () => {
  const msg = formatFilloutError(
    429,
    "GET",
    "/v1/api/forms",
    errorBody(429, "Too Many Requests", "Too many requests. Try again soon."),
  );
  assert(msg.includes("5 requests/second"), msg);
});

Deno.test("client: a non-JSON body is reported verbatim rather than swallowed", () => {
  const msg = formatFilloutError(502, "GET", "/v1/api/forms", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

Deno.test("client: an empty body still names the status and the route", () => {
  const msg = formatFilloutError(500, "GET", "/v1/api/forms", "");
  assert(msg.includes("500"), msg);
  assert(msg.includes("/v1/api/forms"), msg);
});
