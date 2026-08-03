import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  DEFAULT_LIMIT,
  EVENT_TYPES,
  FubClient,
  MAX_LIMIT,
  pageQuery,
  TASK_TYPES,
  unwrapList,
  withCustomFields,
} from "../../lib/client.ts";

Deno.test("client: base URL is the documented api host and v1 path", () => {
  assertEquals(API_URL, "https://api.followupboss.com/v1");
});

Deno.test("client: documented paging defaults and ceiling", () => {
  assertEquals(DEFAULT_LIMIT, 10);
  assertEquals(MAX_LIMIT, 100);
});

Deno.test("client: builds a GET with query params, dropping empties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new FubClient(ctx).request("/people", {
    query: { email: "a@example.com", limit: 25, stage: undefined, source: "", offset: 0 },
  });
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.followupboss.com/v1/people");
  assertEquals(url.searchParams.get("email"), "a@example.com");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("offset"), "0");
  assert(!url.searchParams.has("stage"), "undefined param leaked into the query string");
  assert(!url.searchParams.has("source"), "empty-string param leaked into the query string");
});

Deno.test("client: sets content-type only when a body is present", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }]);
  const client = new FubClient(ctx);
  await client.request("/people", { method: "POST", body: { firstName: "Mary" } });
  await client.request("/people");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ firstName: "Mary" }));
  assertEquals(calls[1].headers["content-type"], undefined);
});

/**
 * The credential is the sign hook's business. The client must never build one,
 * so a request it produces carries no auth headers at all.
 */
Deno.test("client: never sets an auth or system header itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new FubClient(ctx).request("/identity");
  const names = Object.keys(calls[0].headers).map((h) => h.toLowerCase());
  assert(!names.includes("authorization"), "client built an Authorization header");
  assert(!names.includes("x-system"), "client built an X-System header");
  assert(!names.includes("x-system-key"), "client built an X-System-Key header");
});

Deno.test("client: a 204 returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new FubClient(ctx).request("/events", { method: "POST", body: {} });
  assertEquals(result, undefined);
});

Deno.test("client: surfaces the API's errorMessage on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: { errorMessage: "Invalid stage name" } },
  ]);
  const error = await assertRejects(() => new FubClient(ctx).request("/people"));
  assert(error instanceof Error);
  assert(error.message.includes("Invalid stage name"), error.message);
  assert(error.message.includes("400"), error.message);
});

/** The `/rateLimit/*` endpoints use `error`, not `errorMessage`. Both are read. */
Deno.test("client: surfaces the alternate `error` key too", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { error: "Only registered systems can use this endpoint." } },
  ]);
  const error = await assertRejects(() => new FubClient(ctx).request("/rateLimit/limits"));
  assert(error instanceof Error);
  assert(error.message.includes("Only registered systems"), error.message);
});

Deno.test("client: falls back to the raw body when neither error key is present", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const error = await assertRejects(() => new FubClient(ctx).request("/people"));
  assert(error instanceof Error);
  assert(error.message.includes("bad gateway"), error.message);
});

// --- the envelope ----------------------------------------------------------

Deno.test("unwrapList: reads the array named by _metadata.collection", () => {
  const { records, metadata } = unwrapList({
    _metadata: { collection: "people", offset: 0, limit: 10, total: 35 },
    people: [{ id: 1 }, { id: 2 }],
  });
  assertEquals(records.length, 2);
  assertEquals(metadata.total, 35);
});

/**
 * The trap this exists for: `/customFields` and `/smartLists` lower-case their
 * collection key, so deriving it from the request path yields `undefined`.
 */
Deno.test("unwrapList: handles the lower-cased customfields/smartlists keys", () => {
  const custom = unwrapList({
    _metadata: { collection: "customfields", total: 4 },
    customfields: [{ id: 2, name: "customBirthday" }],
  });
  assertEquals(custom.records.length, 1);

  const smart = unwrapList({
    _metadata: { collection: "smartlists", total: 3 },
    smartlists: [{ id: 14 }, { id: 15 }, { id: 16 }],
  });
  assertEquals(smart.records.length, 3);
});

Deno.test("unwrapList: falls back to the only non-metadata array", () => {
  const { records } = unwrapList({ _metadata: { offset: 0 }, tasks: [{ id: 9 }] });
  assertEquals(records, [{ id: 9 }]);
});

Deno.test("unwrapList: falls back when _metadata names a key that is absent", () => {
  const { records } = unwrapList({
    _metadata: { collection: "notthere" },
    deals: [{ id: 2146 }],
  });
  assertEquals(records, [{ id: 2146 }]);
});

Deno.test("unwrapList: degrades to empty rather than throwing on junk", () => {
  assertEquals(unwrapList(null).records, []);
  assertEquals(unwrapList("nope").records, []);
  assertEquals(unwrapList({ _metadata: {} }).records, []);
});

Deno.test("client.list: flattens the envelope end to end", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      _metadata: { collection: "people", total: 2, next: "eyJzaW5jZUlkIjoxMDV9" },
      people: [{ id: 950 }, { id: 949 }],
    },
  }]);
  const result = await new FubClient(ctx).list("/people", { query: { limit: 2 } });
  assertEquals(result.records.length, 2);
  assertEquals(result.metadata.next, "eyJzaW5jZUlkIjoxMDV9");
  assert(calls[0].url.includes("limit=2"));
});

// --- body helpers ----------------------------------------------------------

Deno.test("compact: strips undefined but keeps an explicit null", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false }),
    { a: 1, c: null, d: "", e: false },
  );
});

Deno.test("withCustomFields: merges custom fields as flat top-level keys", () => {
  assertEquals(
    withCustomFields({ firstName: "Mary", lastName: undefined }, {
      customClosePrice: 425000,
      customBirthday: "1990-02-16",
    }),
    { firstName: "Mary", customClosePrice: 425000, customBirthday: "1990-02-16" },
  );
});

Deno.test("withCustomFields: ignores a non-object custom-fields value", () => {
  assertEquals(withCustomFields({ a: 1 }, undefined), { a: 1 });
  assertEquals(withCustomFields({ a: 1 }, "nope"), { a: 1 });
  assertEquals(withCustomFields({ a: 1 }, [1, 2]), { a: 1 });
});

Deno.test("pageQuery: maps the shared paging inputs onto their query names", () => {
  assertEquals(pageQuery({ limit: 50, offset: 100, next: "abc" }), {
    limit: 50,
    offset: 100,
    next: "abc",
  });
});

// --- vocabularies ----------------------------------------------------------

/**
 * The event-type list is prose in the docs, not an OpenAPI enum, and an invented
 * entry is the exact failure mode this app was built to avoid. Pinned to the
 * fourteen values that `POST /events` and `GET /events` independently publish.
 */
Deno.test("EVENT_TYPES: exactly the fourteen documented values", () => {
  assertEquals(EVENT_TYPES.length, 14);
  assertEquals([...EVENT_TYPES], [
    "Registration",
    "Inquiry",
    "Seller Inquiry",
    "Property Inquiry",
    "General Inquiry",
    "Viewed Property",
    "Saved Property",
    "Visited Website",
    "Incoming Call",
    "Unsubscribed",
    "Property Search",
    "Saved Property Search",
    "Visited Open House",
    "Viewed Page",
  ]);
});

Deno.test("TASK_TYPES: exactly the nine documented values", () => {
  assertEquals(TASK_TYPES.length, 9);
  assert(TASK_TYPES.includes("Follow Up"));
  assert(TASK_TYPES.includes("Open House"));
  assert(TASK_TYPES.includes("Thank You"));
});
