import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_BASE,
  API_PREFIX,
  asOptionalJson,
  compact,
  formatTeamUpError,
  intList,
  readTeamUpError,
  TeamUpClient,
} from "../../lib/client.ts";

Deno.test("client: builds the documented host and prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new TeamUpClient(ctx).request("/customers/12");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://goteamup.com/api/v2/customers/12");
  assertEquals(API_BASE, "https://goteamup.com");
  assertEquals(API_PREFIX, "/api/v2");
});

Deno.test("client: never signs a request — that is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TeamUpClient(ctx).request("/customers");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["teamup-request-mode"], undefined);
});

Deno.test("client: serializes query values and drops the unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TeamUpClient(ctx).request("/events", {
    query: { status: "active", page: 2, page_size: 100, active_customer: false, ids: undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "100");
  // false and 0 are meaningful values, not absences.
  assertEquals(url.searchParams.get("active_customer"), "false");
  assertEquals(url.searchParams.has("ids"), false);
});

/** The one control that travels as a header rather than in the query. */
Deno.test("client: sends TeamUp-Provider-ID only when a caller names a provider", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new TeamUpClient(ctx);
  await client.request("/customers", { query: {}, providerId: 42 });
  await client.request("/customers");
  assertEquals(calls[0].headers["teamup-provider-id"], "42");
  assertEquals(calls[1].headers["teamup-provider-id"], undefined);
});

Deno.test("client: a JSON body is sent as JSON with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new TeamUpClient(ctx).request("/customers", {
    method: "POST",
    body: { first_name: "Ada", venue: 3 },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Ada", venue: 3 });
});

/** List actions return the envelope verbatim, never `results` alone. */
Deno.test("client: a pagination envelope is returned unchanged", async () => {
  const envelope = {
    count: 2,
    next: "https://goteamup.com/api/v2/customers?page=2&page_size=100",
    previous: null,
    results: [{ id: 1 }, { id: 2 }],
  };
  const { ctx } = mockCtx([{ body: envelope }]);
  assertEquals(await new TeamUpClient(ctx).request("/customers"), envelope);
});

Deno.test("client: surfaces TeamUp's message, code and type", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "parameter_invalid",
      field_errors: { field_name: ["message"] },
      message: "You request was invalid",
      type: "invalid_request_error",
    },
  }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/customers"), Error);
  assert(/TeamUp 400 for GET \/api\/v2\/customers/.test(err.message), err.message);
  assert(/You request was invalid/.test(err.message), err.message);
  assert(/code parameter_invalid/.test(err.message), err.message);
  assert(/type invalid_request_error/.test(err.message), err.message);
});

/** A 401 is reported with TeamUp's own code, not just its status. */
Deno.test("client: a rejected credential is named as such", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "authentication_failed", message: "Invalid token." },
  }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/auth/profiles"), Error);
  assert(/authentication_failed/.test(err.message), err.message);
  assert(/Invalid token\./.test(err.message), err.message);
  assert(/M2M token was rejected/.test(err.message), err.message);
});

/** A 403's vocabulary is surfaced, never special-cased away. */
Deno.test("client: a 403 keeps TeamUp's own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "permission_denied", message: "You do not have permission." },
  }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/staff"), Error);
  assert(/code permission_denied/.test(err.message), err.message);
  assert(/role or provider-scope mismatch/.test(err.message), err.message);
});

Deno.test("client: a 429 recommends exponential backoff", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { code: "throttled", message: "Too many." } }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/customers"), Error);
  assert(/exponential backoff/.test(err.message), err.message);
});

Deno.test("client: keeps a non-envelope error body verbatim", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/customers"), Error);
  assert(/<html>bad gateway<\/html>/.test(err.message), err.message);
});

Deno.test("client: a non-JSON success body is an error, not a silent empty result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  const err = await assertRejects(() => new TeamUpClient(ctx).request("/customers"), Error);
  assert(/did not return JSON/.test(err.message), err.message);
});

Deno.test("client: an empty body parses as undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new TeamUpClient(ctx).request("/customers/1"), undefined);
});

Deno.test("readTeamUpError: message first, then field_errors, then the raw body", () => {
  const envelope = readTeamUpError('{"code":"c","message":"m"}');
  assertEquals(envelope.detail, "m");
  assertEquals(envelope.code, "c");
  assertEquals(
    readTeamUpError('{"field_errors":{"non_field_errors":["nope"]}}').detail,
    "nope",
  );
  assertEquals(readTeamUpError("<html>").detail, "<html>");
  assertEquals(readTeamUpError("").detail, "");
});

Deno.test("formatTeamUpError: an empty body still names the call", () => {
  assertEquals(
    formatTeamUpError(404, "GET", "/api/v2/customers/1", ""),
    "TeamUp 404 for GET /api/v2/customers/1",
  );
});

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("intList: parses a comma list into a real array and rejects junk", () => {
  assertEquals(intList("5, 6"), [5, 6]);
  assertEquals(intList([1, 2]), [1, 2]);
  assertEquals(intList(""), undefined);
  assertEquals(intList(undefined), undefined);
  assertThrows(() => intList("5,x"), Error, "is not an integer");
});

Deno.test("asOptionalJson: accepts a parsed value or raw JSON, and rejects junk", () => {
  assertEquals(asOptionalJson([{ a: 1 }], "p"), [{ a: 1 }]);
  assertEquals(asOptionalJson('[{"a":1}]', "p"), [{ a: 1 }]);
  assertEquals(asOptionalJson("", "p"), undefined);
  assertEquals(asOptionalJson(undefined, "p"), undefined);
  assertThrows(() => asOptionalJson("{oops", "`field_values`"), Error, "is not valid JSON");
});
