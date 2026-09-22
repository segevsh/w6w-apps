import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asStringArray,
  compact,
  encodePathSegment,
  formatSimpleTextingError,
  parseProblem,
  problemCode,
  SimpleTextingClient,
} from "../../lib/client.ts";
import { API_ROOT, mockCtx, page, problem, queryOf } from "../_helpers.ts";

// --- pure helpers -----------------------------------------------------------

Deno.test("compact: drops blank values but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

/**
 * Four resources in this API are addressed by *name or id*, so the path segment
 * can be a list name with spaces in it. Escaping is what stops a name from
 * silently addressing a different path.
 */
Deno.test("encodePathSegment: escapes a name and a phone number as one segment", () => {
  assertEquals(encodePathSegment("My First List"), "My%20First%20List");
  assertEquals(encodePathSegment("  +15551234567 "), "%2B15551234567");
  assertEquals(encodePathSegment("a/b"), "a%2Fb");
  assertEquals(encodePathSegment("507f1f77bcf86cd799439011"), "507f1f77bcf86cd799439011");
});

Deno.test("asStringArray: accepts an array or the comma-separated string typed by hand", () => {
  assertEquals(asStringArray(["a", "b"]), ["a", "b"]);
  assertEquals(asStringArray("a, b ,c"), ["a", "b", "c"]);
  assertEquals(asStringArray(""), undefined);
  assertEquals(asStringArray([]), undefined);
  assertEquals(asStringArray(undefined), undefined);
});

Deno.test("parseProblem: reads a problem body and refuses anything else", () => {
  assertEquals(parseProblem('{"errorCode":"X"}')?.errorCode, "X");
  assertEquals(parseProblem("<html>502</html>"), undefined);
  assertEquals(parseProblem("[1,2]"), undefined);
  assertEquals(parseProblem(""), undefined);
});

Deno.test("problemCode: prefers errorCode, falls back to code", () => {
  assertEquals(problemCode({ errorCode: "A", code: "B" }), "A");
  assertEquals(problemCode({ code: "B" }), "B");
  assertEquals(problemCode(undefined), undefined);
});

/**
 * The 401 sentence names the connection rather than the API: in this API every
 * 401 is a statement about the token, and both the missing and the invalid case
 * answer 401 (verified live).
 */
Deno.test("formatSimpleTextingError: carries status, code, message and a 401 hint", () => {
  const message = formatSimpleTextingError(
    401,
    "GET",
    "/v2/api/tenant",
    JSON.stringify(problem("ERR_AUTH_TOKEN_INVALID", "Tenant not found for provided token")),
  );
  assert(message.includes("401 ERR_AUTH_TOKEN_INVALID"), message);
  assert(message.includes("Tenant not found for provided token"), message);
  assert(message.includes("reconnect"), message);
});

Deno.test("formatSimpleTextingError: keeps the raw body when it is not problem+json", () => {
  const message = formatSimpleTextingError(
    502,
    "POST",
    "/v2/api/messages",
    "<html>bad gateway</html>",
  );
  assert(message.includes("502"), message);
  assert(message.includes("bad gateway"), message);
});

// --- the client -------------------------------------------------------------

Deno.test("client: GETs the versioned URL and skips blank query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "owner@example.com" } }]);
  const body = await new SimpleTextingClient(ctx).json("/api/messages", {
    query: {
      page: 0,
      size: 50,
      accountPhone: "",
      contactPhone: undefined,
      since: "2021-04-28T23:20:08.489Z",
    },
  });

  assertEquals(calls[0].url.startsWith(`${API_ROOT}/api/messages?`), true);
  assertEquals(queryOf(calls[0].url), {
    // `0` survives: skipping it would make page zero impossible to ask for.
    page: "0",
    size: "50",
    since: "2021-04-28T23:20:08.489Z",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals((body as { email: string }).email, "owner@example.com");
});

Deno.test("client: a body is JSON-encoded with a content-type, and GETs carry none", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "abc" } }]);
  await new SimpleTextingClient(ctx).json("/api/messages", {
    method: "POST",
    body: { contactPhone: "1234567890", mode: "AUTO", text: "hi" },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!).mode, "AUTO");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: page() normalises the envelope and keeps the vendor's totals", async () => {
  const { ctx } = mockCtx([{ body: page([{ id: "a" }], { totalPages: 3, totalElements: 101 }) }]);
  const result = await new SimpleTextingClient(ctx).page<{ id: string }>("/api/contacts");
  assertEquals(result.content, [{ id: "a" }]);
  assertEquals(result.totalPages, 3);
  assertEquals(result.totalElements, 101);
});

Deno.test("client: page() tolerates a body with no content array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await new SimpleTextingClient(ctx).page("/api/webhooks");
  assertEquals(result.content, []);
  assertEquals(result.totalPages, undefined);
});

Deno.test("client: status() returns 204 without trying to parse a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new SimpleTextingClient(ctx).status("/api/contacts/1234567890", {
    method: "DELETE",
  });
  assertEquals(status, 204);
});

/** The vendor's own `errorCode` is what a caller needs to see, not a bare status. */
Deno.test("client: a failed request throws with the vendor's code in the message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: problem("ERR_AUTH_TOKEN_MISSING", "Auth token is missing") },
  ]);
  await assertRejects(
    async () => await new SimpleTextingClient(ctx).json("/api/tenant"),
    Error,
    "ERR_AUTH_TOKEN_MISSING",
  );
});

Deno.test("client: no request carries a credential header — signing is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new SimpleTextingClient(ctx).page("/api/phones");
  assertEquals(calls[0].headers["authorization"], undefined);
});
