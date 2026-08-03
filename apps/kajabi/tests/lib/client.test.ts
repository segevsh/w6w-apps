import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_HOST,
  API_URL,
  compact,
  definedQuery,
  errorMessage,
  extraFilters,
  identifierList,
  JSON_API_TYPE,
  jsonObject,
  KajabiClient,
  resourceIdentifier,
  unset,
} from "../../lib/client.ts";
import { bodyOf, doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base URL is the one fixed host, with the /v1 prefix", () => {
  assertEquals(API_HOST, "api.kajabi.com");
  assertEquals(API_URL, "https://api.kajabi.com/v1");
});

Deno.test("client: GET sends the JSON:API accept header and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await new KajabiClient(ctx).request("/contacts/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contacts/1");
  assertEquals(calls[0].headers.accept, JSON_API_TYPE);
  assertEquals(calls[0].body, null);
});

/**
 * JSON:API requires the vendor media type on writes. Plain `application/json`
 * risks a 415 from a strict server, so this is pinned rather than assumed.
 */
Deno.test("client: writes send content-type: application/vnd.api+json", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await new KajabiClient(ctx).request("/contacts", {
    method: "POST",
    body: { data: { type: "contacts" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], JSON_API_TYPE);
  assertEquals(bodyOf(calls[0]), { data: { type: "contacts" } });
});

/**
 * JSON:API relationship removal puts the ids in the request body of a DELETE.
 * The client must therefore allow a body on any method, not just POST/PATCH.
 */
Deno.test("client: DELETE can carry a body — JSON:API relationship removal needs it", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new KajabiClient(ctx).request("/contacts/1/relationships/tags", {
    method: "DELETE",
    body: { data: [{ id: "5", type: "contact_tags" }] },
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(bodyOf(calls[0]), { data: [{ id: "5", type: "contact_tags" }] });
});

Deno.test("client: bracketed JSON:API query keys survive into the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await new KajabiClient(ctx).request("/contacts", {
    query: { "filter[site_id]": "111", "page[number]": 2, "page[size]": 50 },
  });
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["page[number]"], "2");
  assertEquals(q["page[size]"], "50");
});

Deno.test("client: unset query values are dropped, but false and 0 survive", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await new KajabiClient(ctx).request("/purchases", {
    query: {
      "filter[a]": undefined,
      "filter[b]": null,
      "filter[c]": "",
      "filter[active]": false,
      "filter[n]": 0,
    },
  });
  const q = queryOf(calls[0]);
  assert(!("filter[a]" in q));
  assert(!("filter[b]" in q));
  assert(!("filter[c]" in q));
  assertEquals(q["filter[active]"], "false");
  assertEquals(q["filter[n]"], "0");
});

Deno.test("client: a 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new KajabiClient(ctx);
  assertEquals(await client.request("/contacts/1"), undefined);
  assertEquals(await client.request("/contacts/2"), undefined);
});

/**
 * Kajabi's real 401 envelope, copied from the wire (2026-08-03,
 * `GET /v1/me` with no Authorization header). The title and detail must both
 * reach the operator — the detail is the part that says what to do.
 */
Deno.test("client: a JSON:API error surfaces title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: {
      errors: [{
        status: "401",
        source: null,
        title: "Unauthorized",
        detail: "The request is missing an Authorization token, or token is invalid/has expired. " +
          "Request a new token before requesting this resource again.",
      }],
    },
  }]);
  const err = await assertRejects(
    () => new KajabiClient(ctx).request("/me"),
    Error,
  );
  assert(err.message.includes("401"));
  assert(err.message.includes("Unauthorized"));
  assert(err.message.includes("token is invalid/has expired"));
  assert(err.message.includes("/v1/me"));
});

/**
 * An unknown path on api.kajabi.com returns an HTML 404 page, not JSON —
 * verified on the wire. `errorMessage` must not lose the status by throwing on
 * a failed parse.
 */
Deno.test("client: an HTML error body degrades gracefully", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    headers: { "content-type": "text/html" },
    body: "<!doctype html><html><body>The page you were looking for doesn't exist</body></html>",
  }]);
  const err = await assertRejects(() => new KajabiClient(ctx).request("/nope"), Error);
  assert(err.message.includes("404"));
  assert(err.message.includes("doesn't exist"));
});

Deno.test("errorMessage: reads the flat OAuth envelope too", () => {
  assertEquals(
    errorMessage(JSON.stringify({ error: "Invalid client credentials" })),
    "Invalid client credentials",
  );
  assertEquals(
    errorMessage(JSON.stringify({ error: "invalid_grant", error_description: "expired" })),
    "invalid_grant: expired",
  );
});

Deno.test("errorMessage: caps a long body so an HTML page cannot flood an error", () => {
  assertEquals(errorMessage("x".repeat(5000)).length, 400);
  assertEquals(errorMessage(""), "");
});

// ------------------------------------------------------------- primitives --

Deno.test("unset: an empty string means absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("a"), "a");
  assertEquals(unset(undefined), undefined);
});

/**
 * `null` must survive `compact`: several Kajabi contact attributes are typed
 * `["string","null"]`, where null means "clear this field". Collapsing it into
 * "absent" would make blanking a phone number impossible.
 */
Deno.test("compact: drops undefined and empty string, keeps null, false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: "", c: null, d: false, e: 0, f: "x" }),
    { c: null, d: false, e: 0, f: "x" },
  );
});

Deno.test("resourceIdentifier: stringifies the id, as JSON:API requires", () => {
  assertEquals(resourceIdentifier(7, "offers"), { id: "7", type: "offers" });
  assertEquals(resourceIdentifier("7", "offers"), { id: "7", type: "offers" });
});

Deno.test("identifierList: builds the array form and trims", () => {
  assertEquals(identifierList("1, 2 ,3", "contact_tags"), [
    { id: "1", type: "contact_tags" },
    { id: "2", type: "contact_tags" },
    { id: "3", type: "contact_tags" },
  ]);
});

/**
 * Returning `undefined` rather than `[]` is load-bearing: on the PATCH
 * "replace" routes an empty array would clear the whole relationship, and a
 * user who typed whitespace did not ask for that.
 */
Deno.test("identifierList: whitespace yields undefined, never an empty array", () => {
  assertEquals(identifierList("   ", "contact_tags"), undefined);
  assertEquals(identifierList(",,", "contact_tags"), undefined);
  assertEquals(identifierList("", "contact_tags"), undefined);
  assertEquals(identifierList(undefined, "contact_tags"), undefined);
});

Deno.test("jsonObject: accepts an object or a JSON string, rejects the rest", () => {
  assertEquals(jsonObject({ a: 1 }, "F"), { a: 1 });
  assertEquals(jsonObject('{"a":1}', "F"), { a: 1 });
  assertEquals(jsonObject("", "F"), undefined);
  assertEquals(jsonObject(undefined, "F"), undefined);
  assertThrows(() => jsonObject("not json", "F"), Error, "not valid JSON");
  assertThrows(() => jsonObject("[1,2]", "F"), Error, "must be a JSON object");
});

Deno.test("extraFilters: wraps each key in filter[...]", () => {
  assertEquals(
    extraFilters({ created_in_last: 30, subscribed: true }),
    { "filter[created_in_last]": 30, "filter[subscribed]": true },
  );
  assertEquals(extraFilters(undefined), {});
});

Deno.test("extraFilters: drops blanks", () => {
  assertEquals(extraFilters({ a: "", b: null, c: undefined, d: "x" }), { "filter[d]": "x" });
});

/**
 * The key is interpolated into a query parameter *name*, so a key containing
 * `]` or `&` could close the bracket and reach a different parameter entirely.
 * Rejecting loudly beats silently encoding something the author did not mean.
 */
Deno.test("extraFilters: rejects a key that could inject a second query parameter", () => {
  assertThrows(
    () => extraFilters({ "site_id]&fields[contacts": "x" }),
    Error,
    "not a valid Kajabi filter name",
  );
  assertThrows(() => extraFilters({ "a b": "x" }), Error, "not a valid Kajabi filter name");
  assertThrows(() => extraFilters({ "a.b": "x" }), Error, "not a valid Kajabi filter name");
});

Deno.test("extraFilters: a nested value is JSON-encoded rather than dropped", () => {
  assertEquals(extraFilters({ a: { b: 1 } }), { "filter[a]": '{"b":1}' });
});

Deno.test("definedQuery: drops unset entries, keeps false and 0", () => {
  assertEquals(
    definedQuery({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

/**
 * The behaviour `definedQuery` exists for: object spread overwrites by key, not
 * by definedness, so an unset named param would otherwise shadow the same
 * filter supplied through the escape hatch — and shadow it silently, since the
 * client then drops the key and the workflow gets an unfiltered result set.
 */
Deno.test("definedQuery: an unset key cannot shadow an earlier spread", () => {
  const merged = { ...extraFilters({ x: "42" }), ...definedQuery({ "filter[x]": undefined }) };
  assertEquals(merged["filter[x]"], "42");

  // …while a filled-in one still wins, which is the intended precedence.
  const overridden = { ...extraFilters({ x: "42" }), ...definedQuery({ "filter[x]": "99" }) };
  assertEquals(overridden["filter[x]"], "99");
});

/** Without the helper, the shadowing really does happen — the bug is real. */
Deno.test("definedQuery: a raw spread would have lost the value", () => {
  const naive = { ...extraFilters({ x: "42" }), "filter[x]": undefined };
  assertEquals(naive["filter[x]"], undefined);
  assertEquals("filter[x]" in naive, true, "key present but undefined — the silent failure");
});
