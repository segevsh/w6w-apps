import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  encodeId,
  formatStreamtimeError,
  isNotAuthorised,
  StreamtimeClient,
  truncate,
  UNAUTHORISED_BODY,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf, unauthorisedResponse } from "../_helpers.ts";

Deno.test("client: one host and one prefix, taken from the specification's servers[0]", () => {
  assertEquals(API_BASE, "https://api.streamtime.net");
  assertEquals(API_PREFIX, "/v2");
  assertEquals(UNAUTHORISED_BODY, "You are not authorised to make this request");
});

Deno.test("client: compact drops unset values but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("client: encodeId passes integers through and escapes anything else", () => {
  assertEquals(encodeId(12), "12");
  assertEquals(encodeId("12"), "12");
  assertEquals(encodeId(" 12 "), "12");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("client: truncate keeps a long body readable", () => {
  assertEquals(truncate("abc", 10), "abc");
  assert(truncate("x".repeat(20), 10).endsWith("(20 bytes truncated)"));
});

/**
 * The single most important rule in this app: Streamtime answers one identical
 * 401 sentence for a missing token, an invalid token and an unknown path, so a
 * rejection is recognised by the body and never by the status code.
 */
Deno.test("client: a rejection is classified from the body, not the status", () => {
  assertEquals(isNotAuthorised(UNAUTHORISED_BODY), true);
  assertEquals(isNotAuthorised(`  ${UNAUTHORISED_BODY}\n`), true);
  assertEquals(isNotAuthorised('{"error":"token expired"}'), false);
  assertEquals(isNotAuthorised(""), false);
});

Deno.test("client: the 401 message names the vendor's sentence and the fix", () => {
  const message = formatStreamtimeError(401, "GET", "/v2/organisation", UNAUTHORISED_BODY);
  assert(message.includes("Streamtime 401 for GET /v2/organisation"), message);
  assert(message.includes(UNAUTHORISED_BODY), message);
  assert(/Company Settings/.test(message), message);
  assert(/unknown path alike/.test(message), message);
});

Deno.test("client: a non-vendor error body is quoted verbatim", () => {
  const message = formatStreamtimeError(500, "POST", "/v2/jobs", "upstream exploded");
  assertEquals(message, "Streamtime 500 for POST /v2/jobs: upstream exploded");
  assertEquals(
    formatStreamtimeError(502, "GET", "/v2/branches", ""),
    "Streamtime 502 for GET /v2/branches: no response body",
  );
});

Deno.test("client: request() sends the query, parses JSON and returns a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const result = await new StreamtimeClient(ctx).request("/branches", {
    query: { a: 1, b: true, skip: undefined, none: null, empty: "" },
  });

  assertEquals(result, [{ id: 1 }]);
  assertEquals(pathOf(calls[0].url), "/v2/branches");
  assertEquals(queryOf(calls[0].url), { a: "1", b: "true" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "application/json");
});

/**
 * The one array-valued query parameter is documented as "a JSON array in the
 * query string", so it is serialised, not repeated.
 */
Deno.test("client: an array query value is JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new StreamtimeClient(ctx).request("/users/1/saved_segments", {
    query: { saved_segment_type_ids: [3, 4] },
  });
  assertEquals(queryOf(calls[0].url).saved_segment_type_ids, "[3,4]");
});

Deno.test("client: a JSON body is sent with the content type Streamtime expects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new StreamtimeClient(ctx).request("/jobs", { method: "POST", body: { name: "Website" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"Website"}');
});

Deno.test("client: a rejected request throws with the vendor's own words", async () => {
  const { ctx } = mockCtx([unauthorisedResponse()]);
  const error = await assertRejects(
    () => new StreamtimeClient(ctx).request("/organisation"),
    Error,
  );
  assert(error.message.includes(UNAUTHORISED_BODY), error.message);
});

Deno.test("client: text() and bytes() do not parse the body as JSON", async () => {
  const { ctx, calls } = mockCtx([
    { body: "<html>quote</html>", headers: { "content-type": "text/html" } },
    { body: "%PDF-1.4", headers: { "content-type": "application/pdf" } },
  ]);
  const client = new StreamtimeClient(ctx);

  const html = await client.text("/quotes/1/html");
  assertEquals(html.text, "<html>quote</html>");
  assertEquals(html.contentType, "text/html");
  // The document endpoints are asked for `*/*`: Streamtime serves HTML and PDF
  // from the same API, so announcing a JSON-only accept would be wrong.
  assertEquals(calls[0].headers.accept, "*/*");

  const pdf = await client.bytes("/quotes/1/pdf");
  assertEquals(pdf.contentType, "application/pdf");
  assertEquals(new TextDecoder().decode(pdf.bytes), "%PDF-1.4");
});

Deno.test("client: status() reports the code and statusAndJson() reads an open body", async () => {
  const { ctx } = mockCtx([
    { status: 204 },
    { body: { ok: true } },
  ]);
  const client = new StreamtimeClient(ctx);
  assertEquals(await client.status("/logged_times/1", { method: "DELETE" }), 204);
  assertEquals(
    await client.statusAndJson("/jobs/1/job_status"),
    { status: 200, body: { ok: true } },
  );
});
