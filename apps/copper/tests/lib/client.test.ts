import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  CopperClient,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseTotal,
  searchBody,
} from "../../lib/client.ts";

Deno.test("client: the base URL is Copper's documented one, developer_api segment and all", () => {
  assertEquals(API_URL, "https://api.copper.com/developer_api/v1");
});

Deno.test("client: paging constants match Copper's documented defaults and ceiling", () => {
  assertEquals(DEFAULT_PAGE_SIZE, 20);
  assertEquals(MAX_PAGE_SIZE, 200);
});

Deno.test("client: GET sends no body and no content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await new CopperClient(ctx).request("/people/1");
  assertEquals(calls[0].url, `${API_URL}/people/1`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a body earns Content-Type: application/json, as Copper requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await new CopperClient(ctx).request("/people", { method: "POST", body: { name: "Jim" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "Jim" }));
});

Deno.test("client: never builds an auth header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new CopperClient(ctx).request("/people", { method: "POST", body: { name: "Jim" } });
  for (const name of Object.keys(calls[0].headers)) {
    assert(!name.startsWith("x-pw-"), `client set ${name} itself`);
    assert(name !== "authorization", "client set an Authorization header");
  }
});

Deno.test("client: query params are appended, and empty values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new CopperClient(ctx).request("/pipeline_stages", {
    query: { pipeline_id: 7, blank: "", missing: undefined, nulled: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pipeline_id"), "7");
  assertEquals(url.searchParams.get("blank"), null);
  assertEquals(url.searchParams.get("missing"), null);
  assertEquals(url.searchParams.get("nulled"), null);
});

Deno.test("client: a non-2xx raises an error naming the status, method and path", async () => {
  const { ctx } = mockCtx([{ status: 422, statusText: "Unprocessable Entity", body: "bad field" }]);
  const err = await assertRejects(
    () => new CopperClient(ctx).request("/people", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("422"));
  assert(err.message.includes("POST"));
  assert(err.message.includes("/developer_api/v1/people"));
  assert(err.message.includes("bad field"));
});

Deno.test("client: 204 and an empty body come back as undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new CopperClient(ctx);
  assertEquals(await client.request("/people/1", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/people/1"), undefined);
});

/**
 * The POST-search shape, which is the single most important thing this client
 * gets right. Copper has no `GET /people` — every collection read is a POST to a
 * `/search` sub-resource with the filters in a JSON body.
 */
Deno.test("client: search() POSTs a JSON body — it is never a GET with a query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1 }, { id: 2 }] }]);
  await new CopperClient(ctx).search("/people/search", { page_size: 25, sort_by: "name" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_URL}/people/search`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { page_size: 25, sort_by: "name" });
  // Nothing leaked into the query string.
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("client: search() returns the bare array under `records`", async () => {
  // Copper's search responses have no envelope — the body IS the array.
  const { ctx } = mockCtx([{ status: 200, body: [{ id: 1 }, { id: 2 }] }]);
  const out = await new CopperClient(ctx).search("/people/search", {});
  assertEquals(out.records, [{ id: 1 }, { id: 2 }]);
});

Deno.test("client: search() reads the total off the X-PW-TOTAL header", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: 1 }],
    headers: { "content-type": "application/json", "x-pw-total": "775" },
  }]);
  const out = await new CopperClient(ctx).search("/people/search", {});
  assertEquals(out.total, 775);
});

Deno.test("client: an absent X-PW-TOTAL yields undefined, not 0", async () => {
  // "Copper did not say how many there are" and "there are none" are different
  // answers; collapsing them would make a paging loop stop early.
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const out = await new CopperClient(ctx).search("/people/search", {});
  assertEquals(out.records, []);
  assertEquals(out.total, undefined);
});

Deno.test("client: search() tolerates a non-array body rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: true } }]);
  const out = await new CopperClient(ctx).search("/people/search", {});
  assertEquals(out.records, []);
});

Deno.test("parseTotal: parses digits, rejects everything else", () => {
  assertEquals(parseTotal("775"), 775);
  assertEquals(parseTotal("0"), 0);
  assertEquals(parseTotal(null), undefined);
  assertEquals(parseTotal(undefined), undefined);
  assertEquals(parseTotal(""), undefined);
  assertEquals(parseTotal("   "), undefined);
  assertEquals(parseTotal("many"), undefined);
});

Deno.test("compact: drops undefined but keeps null, which Copper reads as `clear this field`", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, c: null, d: "", e: false, f: 0 },
  );
});

Deno.test("searchBody: maps the shared paging params onto Copper's snake_case body keys", () => {
  assertEquals(
    searchBody({ pageNumber: 2, pageSize: 200, sortBy: "date_modified", sortDirection: "desc" }),
    { page_number: 2, page_size: 200, sort_by: "date_modified", sort_direction: "desc" },
  );
});

Deno.test("searchBody: omits paging entirely when nothing was supplied", () => {
  assertEquals(searchBody({}), {});
});

Deno.test("searchBody: merges filters and drops the blank ones", () => {
  assertEquals(
    searchBody({ pageSize: 25 }, { name: "Jim", city: undefined, tags: ["vip"] }),
    { name: "Jim", tags: ["vip"], page_size: 25 },
  );
});
