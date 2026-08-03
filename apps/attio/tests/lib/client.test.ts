import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  AttioClient,
  compact,
  explainCode,
  NOTES_DEFAULT_LIMIT,
  NOTES_MAX_LIMIT,
  optionsFrom,
  pageParams,
  QUERY_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  unwrapList,
} from "../../lib/client.ts";

Deno.test("API_URL: the servers[0].url from both OpenAPI documents, plus /v2", () => {
  assertEquals(API_URL, "https://api.attio.com/v2");
});

Deno.test("client: GETs with an accept header and no content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1 } } }]);
  await new AttioClient(ctx).data("/objects");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects");
  assertEquals(calls[0].headers["accept"], "application/json");
  // A bodyless GET has nothing to type; setting content-type anyway is noise.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

/**
 * The one guarantee the whole app rests on: nothing in the client builds an
 * `Authorization` header. Only the auth `sign` hook is handed the credential.
 */
Deno.test("client: never sends an Authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new AttioClient(ctx).list("/objects");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: POSTs JSON with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: 1 } } }]);
  await new AttioClient(ctx).data("/objects/people/records", {
    method: "POST",
    body: { data: { values: { name: "Smith, John" } } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { data: { values: { name: "Smith, John" } } });
});

Deno.test("client: drops undefined, null and empty-string query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new AttioClient(ctx).list("/tasks", {
    query: { limit: 10, offset: undefined, assignee: null, is_completed: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(url.searchParams.has("assignee"), false);
  // `""` is the tri-state "no preference" on List Tasks' is_completed — dropping
  // it is what makes "return both" reachable.
  assertEquals(url.searchParams.has("is_completed"), false);
});

Deno.test("client: `false` and `0` survive the query builder", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new AttioClient(ctx).list("/tasks", { query: { is_completed: false, offset: 0 } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("is_completed"), "false");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("client: `data()` unwraps the envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: { record_id: "r1" } } } }]);
  const record = await new AttioClient(ctx).data<{ id: { record_id: string } }>("/x");
  assertEquals(record.id.record_id, "r1");
});

/** Every delete on this API is a 200 with `{}`, not a 204. */
Deno.test("client: a 200 with an empty object body is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await new AttioClient(ctx).request("/notes/n1", { method: "DELETE" });
  assertEquals(out, {});
});

Deno.test("client: a 204 with no body yields undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new AttioClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

/*
 * ── unwrapList ───────────────────────────────────────────────────────────────
 */

Deno.test("unwrapList: pulls the `data` array out", () => {
  assertEquals(unwrapList({ data: [{ a: 1 }, { a: 2 }] }), { records: [{ a: 1 }, { a: 2 }] });
});

Deno.test("unwrapList: carries `pagination` through untouched when present", () => {
  assertEquals(
    unwrapList({ data: [], pagination: { next_cursor: "opaque-cursor-value-here" } }),
    { records: [], pagination: { next_cursor: "opaque-cursor-value-here" } },
  );
});

/** An object `data` is wrapped rather than dropped — silently returning [] would lie. */
Deno.test("unwrapList: an object `data` becomes a one-element list", () => {
  assertEquals(unwrapList({ data: { id: 1 } }), { records: [{ id: 1 }] });
});

Deno.test("unwrapList: a missing or malformed envelope yields an empty list, never a throw", () => {
  assertEquals(unwrapList({}), { records: [] });
  assertEquals(unwrapList(null), { records: [] });
  assertEquals(unwrapList("nope"), { records: [] });
});

/*
 * ── Errors ───────────────────────────────────────────────────────────────────
 */

/**
 * The 401 body here is verbatim from the wire, 2026-08-03:
 *   curl https://api.attio.com/v2/objects
 *   -> {"status_code":401,"type":"auth_error","code":"unauthorized",
 *       "message":"The Authorization header was not provided. …"}
 */
Deno.test("client: an error message names the status, the type/code and the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: {
      status_code: 401,
      type: "auth_error",
      code: "unauthorized",
      message: "The Authorization header was not provided.",
    },
  }]);
  const err = await assertRejects(() => new AttioClient(ctx).list("/objects"), Error);
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("auth_error/unauthorized"), err.message);
  assert(err.message.includes("The Authorization header was not provided."), err.message);
  assert(err.message.includes("GET /v2/objects"), err.message);
});

Deno.test("client: a non-JSON error body still produces a usable message", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    statusText: "Bad Gateway",
    body: "<html>cloudflare</html>",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(() => new AttioClient(ctx).list("/objects"), Error);
  assert(err.message.includes("502"), err.message);
  assert(err.message.includes("cloudflare"), err.message);
});

/**
 * The three codes whose remedy is not obvious from Attio's own sentence. Each
 * appends a clause; a code with no clause must append nothing at all.
 */
Deno.test("explainCode: adds a remedy for the codes that need one", () => {
  assert(explainCode("multiple_match_results").includes("unique"));
  assert(explainCode("merge_in_progress").includes("mid-merge"));
  assert(explainCode("quota_exceeded").includes("PLAN limit"));
  assert(explainCode("billing_error").includes("PLAN limit"));
  assert(explainCode("slug_conflict").includes("unique"));
  assert(explainCode("immutable_value").includes("system-managed"));
});

Deno.test("explainCode: says nothing for a code that speaks for itself", () => {
  assertEquals(explainCode("not_found"), "");
  assertEquals(explainCode(undefined), "");
  assertEquals(explainCode("some_future_code"), "");
});

Deno.test("client: a 429 error message survives, since nothing special-cases it", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    statusText: "Too Many Requests",
    body: {
      status_code: 429,
      type: "rate_limit_error",
      code: "rate_limit_exceeded",
      message: "Rate limit exceeded, please try again later",
    },
  }]);
  const err = await assertRejects(() => new AttioClient(ctx).list("/objects"), Error);
  assert(err.message.includes("rate_limit_error/rate_limit_exceeded"), err.message);
});

/*
 * ── Small helpers ────────────────────────────────────────────────────────────
 */

Deno.test("compact: drops undefined but keeps a deliberate null", () => {
  // The distinction is load-bearing on Update Task: `null` clears the deadline,
  // omission leaves it alone.
  assertEquals(compact({ a: 1, b: undefined, c: null, d: false, e: 0 }), {
    a: 1,
    c: null,
    d: false,
    e: 0,
  });
});

Deno.test("optionsFrom: turns a tuple into value/label options", () => {
  assertEquals(optionsFrom(["asc", "desc"]), [
    { value: "asc", label: "asc" },
    { value: "desc", label: "desc" },
  ]);
});

/**
 * Pagination defaults genuinely differ per endpoint on this API — 500 on the
 * query endpoints, 10 on notes — so the hint has to say which, and the maximum
 * has to be enforced where one exists.
 */
Deno.test("pageParams: states the endpoint's own default and maximum in the hint", () => {
  const [limit] = pageParams({ defaultLimit: NOTES_DEFAULT_LIMIT, maxLimit: NOTES_MAX_LIMIT });
  assert(limit.hint.includes("defaults to 10"), limit.hint);
  assert(limit.hint.includes("maximum is 50"), limit.hint);
  assertEquals((limit.validation as Record<string, unknown>).max, 50);
});

Deno.test("pageParams: omits a maximum when the endpoint documents none", () => {
  const [limit] = pageParams({ defaultLimit: QUERY_DEFAULT_LIMIT });
  assert(limit.hint.includes("defaults to 500"), limit.hint);
  assertEquals("max" in limit.validation, false);
});

Deno.test("pageParams: offset is advanced and starts at zero", () => {
  const [, offset] = pageParams();
  assertEquals(offset.key, "offset");
  assertEquals(offset.advanced, true);
  assertEquals(offset.validation.min, 0);
});

Deno.test("documented limits match the spec", () => {
  assertEquals(QUERY_DEFAULT_LIMIT, 500);
  assertEquals(SEARCH_MAX_LIMIT, 25);
  assertEquals(NOTES_DEFAULT_LIMIT, 10);
  assertEquals(NOTES_MAX_LIMIT, 50);
});
