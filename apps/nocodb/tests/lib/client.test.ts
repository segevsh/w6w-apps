import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertWhere,
  compact,
  csv,
  DEFAULT_PAGE_SIZE,
  describeError,
  hostFromConnection,
  json,
  NocoDBClient,
  normalizeHost,
  query,
  readRateLimit,
} from "../../lib/client.ts";

const D = { display: { host: "https://nocodb.internal" } };

Deno.test("normalizeHost: adds a scheme and strips a trailing API path", () => {
  assertEquals(normalizeHost("app.nocodb.com"), "https://app.nocodb.com");
  assertEquals(normalizeHost("https://nocodb.internal/"), "https://nocodb.internal");
  assertEquals(normalizeHost("https://nocodb.internal/api/v2/meta"), "https://nocodb.internal");
  assertEquals(normalizeHost("http://localhost:8080"), "http://localhost:8080");
  assertThrows(() => normalizeHost(""), Error, "required");
});

Deno.test("hostFromConnection: says to reconnect when no host is recorded", () => {
  assertEquals(hostFromConnection(D), "https://nocodb.internal");
  const err = assertThrows(() => hostFromConnection({ display: {} }), Error);
  assert(/self-hosted as often as not/.test(err.message), err.message);
});

Deno.test("request: builds the path and never sets the token header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: [] } }], D);
  await new NocoDBClient(ctx).request("/api/v2/meta/bases");
  assertEquals(calls[0].url, "https://nocodb.internal/api/v2/meta/bases");
  assertEquals(calls[0].headers["xc-token"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Measured: NocoDB publishes these on every response. */
Deno.test("readRateLimit: reads the three headers NocoDB sends", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { list: [] },
    headers: {
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "57",
      "x-ratelimit-reset": "60",
    },
  }], D);
  const result = await new NocoDBClient(ctx).full("/api/v2/meta/bases");
  assertEquals(result.rateLimit, { limit: 60, remaining: 57, resetSeconds: 60 });

  assertEquals(readRateLimit(new Headers()), {
    limit: undefined,
    remaining: undefined,
    resetSeconds: undefined,
  });
});

/**
 * The filter trap: with spaces the request succeeds and returns nothing, so a
 * workflow reads "no records matched" and carries on.
 */
Deno.test("assertWhere: refuses spaces inside a condition, and SQL", () => {
  assertWhere("");
  assertWhere("(Status,eq,Active)");
  assertWhere("(Status,eq,Active)~and(Amount,gt,100)");
  // Spaces inside a VALUE are fine; only the separators matter.
  assertWhere("(Name,like,%some value%)");

  const spaced = assertThrows(() => assertWhere("(Status, eq, Active)"), Error);
  assert(/returns NOTHING/.test(spaced.message), spaced.message);
  const sql = assertThrows(() => assertWhere("Status = 'Active'"), Error);
  assert(/looks like SQL/.test(sql.message), sql.message);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(DEFAULT_PAGE_SIZE, 25);
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 0, c: "" }), { a: "x", b: 0 });
});

/** NocoDB's codes are stable; its messages are prose. */
Deno.test("describeError: reads the error code rather than matching the message", () => {
  const auth = describeError(
    401,
    JSON.stringify({ error: "ERR_AUTHENTICATION_REQUIRED", message: "Invalid token" }),
  );
  assert(/\[ERR_AUTHENTICATION_REQUIRED\]/.test(auth), auth);
  assert(/`xc-auth` and expires/.test(auth), auth);
});

/** Verified live: the table check happens before the credential check. */
Deno.test("describeError: a missing table says it is never an auth problem", () => {
  const message = describeError(
    404,
    JSON.stringify({ error: "ERR_TABLE_NOT_FOUND", message: "Table 'x' not found" }),
  );
  assert(/BEFORE the credential/.test(message), message);
  assert(/never an auth one/.test(message), message);
});

Deno.test("describeError: a 429 quotes the published budget", () => {
  const message = describeError(429, JSON.stringify({ message: "Too many requests" }));
  assert(/60 requests a minute/.test(message), message);
  assert(/x-ratelimit-remaining/.test(message), message);
});

Deno.test("describeError: an unknown code still comes through", () => {
  const message = describeError(400, JSON.stringify({ error: "ERR_NEW_THING", message: "nope" }));
  assertEquals(message, "nope [ERR_NEW_THING]");
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "ERR_TABLE_NOT_FOUND", message: "Table 'bogus' not found" },
  }], D);
  let message = "";
  try {
    await new NocoDBClient(ctx).request("/api/v2/tables/bogus/records");
  } catch (err) {
    message = String(err);
  }
  assert(/NocoDB 404 for GET \/api\/v2\/tables\/bogus\/records/.test(message), message);
});
