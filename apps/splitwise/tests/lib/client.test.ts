import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  collectErrors,
  compact,
  encodeId,
  formatSplitwiseError,
  pick,
  softFailure,
  SplitwiseClient,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

// --- collectErrors: the three documented shapes ------------------------------

Deno.test("collectErrors: the singular `error` string (the 401 body)", () => {
  assertEquals(collectErrors(UNAUTHORIZED_BODY), ["Invalid API Request: you are not logged in"]);
});

Deno.test("collectErrors: the object shape, with `base` unprefixed", () => {
  assertEquals(collectErrors(errorBody(["Unrecognized parameter `bad_parameter`"])), [
    "Unrecognized parameter `bad_parameter`",
  ]);
});

Deno.test("collectErrors: a non-`base` field keeps its name — the fix differs per field", () => {
  assertEquals(collectErrors(errorBody(["is invalid"], "email")), ["email: is invalid"]);
});

/** `undelete_group` declares `errors` as a bare array of strings. */
Deno.test("collectErrors: the bare-array shape", () => {
  assertEquals(collectErrors({ errors: ["That group is not deleted"] }), [
    "That group is not deleted",
  ]);
});

/**
 * The trap. `[]` and `{}` are both truthy, so `if (body.errors)` reports every
 * successful undelete as a failure — and `body.errors?.base` misses the array
 * form entirely, reporting every failed one as a success.
 */
Deno.test("collectErrors: an EMPTY errors object or array is not a failure", () => {
  assertEquals(collectErrors({ errors: {} }), []);
  assertEquals(collectErrors({ errors: [] }), []);
  assertEquals(collectErrors({ expenses: [{ id: 1 }], errors: {} }), []);
  // …and the naive checks this exists to replace really are wrong:
  assert(Boolean({ errors: [] }.errors), "an empty array is truthy — hence collectErrors");
  assert(Boolean({ errors: {} }.errors), "an empty object is truthy — hence collectErrors");
});

Deno.test("collectErrors: ignores an empty string and a non-object body", () => {
  assertEquals(collectErrors({ error: "" }), []);
  assertEquals(collectErrors(null), []);
  assertEquals(collectErrors("not an object"), []);
  assertEquals(collectErrors({ user: { id: 1 } }), []);
});

// --- softFailure: the two channels ------------------------------------------

Deno.test("softFailure: a populated `errors` on a 200 is a failure", () => {
  assertEquals(softFailure({ expenses: [], errors: errorBody(["nope"]).errors }), ["nope"]);
});

Deno.test("softFailure: `success: false` is a failure even with no error detail", () => {
  const messages = softFailure({ success: false })!;
  assertEquals(messages.length, 1);
  assert(/success=false/.test(messages[0]), messages[0]);
});

/**
 * `success` is only consulted when present: no read endpoint returns it, and
 * treating its absence as a failure would reject every successful read.
 */
Deno.test("softFailure: an absent `success` is not a failure", () => {
  assertEquals(softFailure({ groups: [] }), undefined);
  assertEquals(softFailure({ success: true }), undefined);
  assertEquals(softFailure({ success: true, errors: {} }), undefined);
});

// --- the request path -------------------------------------------------------

Deno.test("client: GET builds the versioned URL and drops unset query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { expenses: [] } }]);
  await new SplitwiseClient(ctx).request("/get_expenses", {
    query: { group_id: 0, friend_id: undefined, limit: 20, offset: null, q: "" },
  });

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_expenses");
  // `0` survives: group_id=0 selects expenses in no group, and dropping it
  // would make that case impossible to express.
  assertEquals(queryOf(calls[0].url), { group_id: "0", limit: "20" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: POST sends a JSON body with the content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: { id: 7 } } }]);
  await new SplitwiseClient(ctx).request("/create_group", {
    method: "POST",
    body: { name: "Trip" },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Trip" });
});

/**
 * The rule this whole client exists for: Splitwise answers 200 with an `errors`
 * payload when a write fails, and its own reference says "200 OK does not
 * indicate a successful response" in six places.
 */
Deno.test("client: a 200 carrying `errors` is thrown, not returned", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { expenses: [], errors: { base: ["That group does not exist"] } },
  }]);
  const error = await assertRejects(
    () => new SplitwiseClient(ctx).request("/create_expense", { method: "POST", body: {} }),
    Error,
    "That group does not exist",
  );
  assert(/HTTP 200/.test(error.message), error.message);
  assert(/soft-failure channel/.test(error.message), error.message);
});

Deno.test("client: a 200 carrying `success: false` is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false } }]);
  await assertRejects(
    () => new SplitwiseClient(ctx).request("/delete_expense/1", { method: "POST" }),
    Error,
    "success=false",
  );
});

Deno.test("client: a 200 with an empty `errors` object is returned normally", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { expenses: [{ id: 9 }], errors: {} } }]);
  const body = await new SplitwiseClient(ctx).request("/create_expense", {
    method: "POST",
    body: {},
  });
  assertEquals((body as { expenses: Array<{ id: number }> }).expenses[0].id, 9);
});

Deno.test("client: the 401 message says the body cannot distinguish the four causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const error = await assertRejects(
    () => new SplitwiseClient(ctx).request("/get_groups"),
    Error,
    "Invalid API Request: you are not logged in",
  );
  assert(/does not distinguish/.test(error.message), error.message);
});

Deno.test("client: a 429 says there is nothing to back off against", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody(["slow down"]) }]);
  const error = await assertRejects(
    () => new SplitwiseClient(ctx).request("/get_groups"),
    Error,
    "429",
  );
  assert(/no rate-limit headers/.test(error.message), error.message);
});

Deno.test("client: a 403 keeps its status, so it is not confused with a 404", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody(["Invalid API request: you do not have permission to perform that action"]),
  }]);
  await assertRejects(
    () => new SplitwiseClient(ctx).request("/get_expense/1"),
    Error,
    "Splitwise 403 for GET /api/v3.0/get_expense/1",
  );
});

/**
 * Splitwise serves its marketing site and its API from one origin, so an HTML
 * body reaching a JSON path means the router changed or a proxy intervened.
 * Returning `undefined` from a "successful" read is worse than saying so.
 */
Deno.test("client: an HTML body on a 200 is an error, not an empty result", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<!DOCTYPE html><html><title>Splitwise :: 404 Error</title></html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(
    () => new SplitwiseClient(ctx).request("/get_groups"),
    Error,
    "non-JSON body",
  );
});

Deno.test("client: an empty body is an empty object, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new SplitwiseClient(ctx).request("/delete_comment/1", { method: "POST" }), {});
});

// --- small helpers ----------------------------------------------------------

Deno.test("encodeId: accepts an integer id and rejects a path-traversal attempt", () => {
  assertEquals(encodeId(51023, "expenseId"), "51023");
  assertEquals(encodeId(" 42 ", "expenseId"), "42");
  for (const bad of ["1/../../delete_group/2", "abc", "-1", "1.5", "", "1 OR 1=1"]) {
    let threw = false;
    try {
      encodeId(bad, "expenseId");
    } catch {
      threw = true;
    }
    assert(threw, `encodeId accepted "${bad}"`);
  }
});

Deno.test("compact: keeps 0 and false, drops undefined, null and empty string", () => {
  assertEquals(compact({ a: 0, b: false, c: undefined, d: null, e: "", f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
});

Deno.test("pick: reads a named envelope key with a fallback", () => {
  assertEquals(pick({ user: { id: 1 } }, "user", {}), { id: 1 });
  assertEquals(pick({}, "groups", []), []);
  assertEquals(pick({ groups: null }, "groups", []), []);
});

Deno.test("truncate: keeps short text and marks what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("bytes truncated"));
});

Deno.test("formatSplitwiseError: falls back to the raw body when nothing parsed", () => {
  const message = formatSplitwiseError(500, "GET", "/api/v3.0/get_groups", [], "upstream boom");
  assert(/Splitwise 500 for GET/.test(message), message);
  assert(/upstream boom/.test(message), message);
});
