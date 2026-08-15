import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  appendQuery,
  encodeId,
  encodeSegment,
  flag,
  formatRcError,
  RingCentralClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, listEnvelope, mockCtx, queryAllOf, queryOf } from "../_helpers.ts";

// --- encodeId / encodeSegment ------------------------------------------------

Deno.test("encodeId: defaults empty/missing input to ~", () => {
  assertEquals(encodeId(undefined), "~");
  assertEquals(encodeId(null), "~");
  assertEquals(encodeId(""), "~");
  assertEquals(encodeId("   "), "~");
});

Deno.test("encodeId: ~ survives encoding unescaped", () => {
  assertEquals(encodeId("~"), "~");
});

Deno.test("encodeId: a real id is percent-encoded but not defaulted", () => {
  assertEquals(encodeId("123456"), "123456");
  assertEquals(encodeId("a/b"), "a%2Fb");
});

Deno.test("encodeSegment: does NOT default empty input to ~", () => {
  assertEquals(encodeSegment(""), "");
  assertEquals(encodeSegment("8930983240"), "8930983240");
});

// --- appendQuery -------------------------------------------------------------

Deno.test("appendQuery: repeats the key once per array element, not comma-joined", () => {
  const url = new URL("https://example.com/x");
  appendQuery(url, "status", ["Enabled", "Disabled"]);
  assertEquals(queryAllOf(url.toString(), "status"), ["Enabled", "Disabled"]);
  assert(!url.toString().includes("Enabled,Disabled"));
});

Deno.test("appendQuery: drops undefined, null and empty-string values", () => {
  const url = new URL("https://example.com/x");
  appendQuery(url, "a", undefined);
  appendQuery(url, "b", null);
  appendQuery(url, "c", "");
  assertEquals(url.searchParams.toString(), "");
});

Deno.test("appendQuery: a false boolean is still appended (RingCentral flags are ternary)", () => {
  const url = new URL("https://example.com/x");
  appendQuery(url, "showDeleted", false);
  assertEquals(queryOf(url.toString()).showDeleted, "false");
});

// --- toList / flag / truncate -------------------------------------------------

Deno.test("toList: splits a comma-separated string and trims each entry", () => {
  assertEquals(toList("+15550001, +15550002 ,+15550003"), [
    "+15550001",
    "+15550002",
    "+15550003",
  ]);
});

Deno.test("toList: passes an array through, dropping blanks", () => {
  assertEquals(toList(["+15550001", "", " +15550002 "]), ["+15550001", "+15550002"]);
});

Deno.test('toList: empty/missing input is an empty list, not [""]', () => {
  assertEquals(toList(undefined), []);
  assertEquals(toList(null), []);
  assertEquals(toList(""), []);
});

Deno.test("flag: true passes through, false and undefined are dropped", () => {
  assertEquals(flag(true), true);
  assertEquals(flag(false), undefined);
  assertEquals(flag(undefined), undefined);
});

Deno.test("truncate: leaves short text alone and caps long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(50);
  assertEquals(truncate(long, 10), "xxxxxxxxxx… (50 bytes truncated)");
});

// --- formatRcError -------------------------------------------------------------

Deno.test("formatRcError: reads the real live shape (top-level + nested errors[])", () => {
  const raw = JSON.stringify({
    errorCode: "TokenInvalid",
    message: "OAuth token is invalid",
    errors: [{ errorCode: "OAU-149", message: "OAuth token is invalid" }],
  });
  const msg = formatRcError(401, "GET", "/restapi/v1.0/account/~/extension/~", raw);
  assert(msg.includes("401"));
  assert(msg.includes("TokenInvalid"));
  assert(msg.includes("OAuth token is invalid"));
});

Deno.test("formatRcError: a single-entry errors[] with no parameterName is not repeated", () => {
  const raw = JSON.stringify({
    errorCode: "OAU-149",
    message: "OAuth token is invalid",
    errors: [{ errorCode: "OAU-149", message: "OAuth token is invalid" }],
  });
  const msg = formatRcError(401, "GET", "/x", raw);
  // The detail line only appears for >1 entries or a named parameter.
  assertEquals(msg.split("OAuth token is invalid").length, 2);
});

Deno.test("formatRcError: multiple sub-errors are all surfaced", () => {
  const raw = JSON.stringify({
    errorCode: "CMN-102",
    message: "Multiple errors",
    errors: [
      { errorCode: "CMN-103", message: "from is required", parameterName: "from" },
      { errorCode: "CMN-104", message: "to is required", parameterName: "to" },
    ],
  });
  const msg = formatRcError(400, "POST", "/x", raw);
  assert(msg.includes("from"));
  assert(msg.includes("to"));
});

Deno.test("formatRcError: a non-JSON body falls back to the raw text", () => {
  const msg = formatRcError(500, "GET", "/x", "<html>upstream exploded</html>");
  assert(msg.includes("500"));
  assert(msg.includes("upstream exploded"));
});

// --- RingCentralClient ---------------------------------------------------------

Deno.test("RingCentralClient: request() parses JSON and hits the right URL", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await new RingCentralClient(ctx).request<{ records: unknown[] }>(
    "/restapi/v1.0/account/~/extension",
  );
  assertEquals(calls[0].url, `${API_BASE}/restapi/v1.0/account/~/extension`);
  assertEquals(out.records, [{ id: "1" }]);
});

Deno.test("RingCentralClient: request() sends the JSON body and content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await new RingCentralClient(ctx).request("/restapi/v1.0/x", {
    method: "POST",
    body: { text: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ text: "hi" }));
});

Deno.test("RingCentralClient: request() returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new RingCentralClient(ctx).request("/restapi/v1.0/x", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("RingCentralClient: request() throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("CMN-405", "Permission missing") }]);
  await assertRejects(
    () => new RingCentralClient(ctx).request("/restapi/v1.0/x"),
    Error,
    "CMN-405",
  );
});
