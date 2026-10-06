import { assertEquals, assertThrows } from "@std/assert";
import {
  compact,
  encodeId,
  errorCode,
  errorText,
  flattenResource,
  isErrorEnvelope,
  jsonApiBody,
  listQuery,
  omitKeys,
  ProductiveClient,
  queryString,
  requireAny,
  serializeFilter,
  toObject,
} from "../../lib/client.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("encodeId: escapes slashes and refuses an empty id", () => {
  assertEquals(encodeId(" 4/5 "), "4%2F5");
  assertEquals(encodeId(12), "12");
  assertThrows(() => encodeId("  "), Error, "id is required");
});

Deno.test("compact and queryString: false and 0 survive, empties go", () => {
  assertEquals(compact({ a: 0, b: false, c: "", d: null, e: undefined, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(queryString({ a: undefined, "page[after]": "", b: 0 }), "?page%5Bafter%5D=&b=0");
  assertEquals(queryString({}), "");
});

Deno.test("toObject: accepts an object or JSON text, rejects the rest", () => {
  assertEquals(toObject('{"a":1}', "x"), { a: 1 });
  assertEquals(toObject({ a: 1 }, "x"), { a: 1 });
  assertEquals(toObject("", "x"), undefined);
  assertThrows(() => toObject("{nope", "custom fields"), Error, "custom fields is not valid JSON");
  assertThrows(() => toObject("[1]", "x"), Error, "must be a JSON object");
});

Deno.test("jsonApiBody and requireAny", () => {
  assertEquals(jsonApiBody("tasks", { title: "t", note: "", n: 0 }), {
    data: { type: "tasks", attributes: { title: "t", n: 0 } },
  });
  assertThrows(() => requireAny({ a: undefined }, "task"), Error, "task needs at least one field");
  requireAny({ a: false }, "task");
});

Deno.test("serializeFilter: operators, lists and nested logical groups", () => {
  assertEquals(
    serializeFilter({ name: { contains: "x" }, id: [1, 2], $op: "or", "0": { a: 1 }, skip: null }),
    { "filter[name][contains]": "x", "filter[id]": "1,2", "filter[$op]": "or", "filter[0][a]": 1 },
  );
});

Deno.test("listQuery: typed filters win over the raw filter; cursor beats page number", () => {
  assertEquals(
    listQuery({ filter: { project_id: 1 }, pageNumber: 3, pageSize: 10 }, { project_id: 2 }),
    { "filter[project_id]": 2, "page[size]": 10, "page[number]": 3 },
  );
  assertEquals(listQuery({ cursor: "c", pageNumber: 3 }), { "page[after]": "c" });
  assertEquals(listQuery({ cursorPaging: true }), { "page[after]": "" });
});

Deno.test("flattenResource: attributes plus id, type and relationship ids", () => {
  assertEquals(
    flattenResource({
      id: "1",
      type: "tasks",
      attributes: { title: "t" },
      relationships: { project: { data: { id: "9", type: "projects" } }, x: {} },
    }),
    {
      title: "t",
      id: "1",
      type: "tasks",
      relationships: { project: { id: "9", type: "projects" } },
    },
  );
  assertEquals(flattenResource({ id: "1", type: "t" }), { id: "1", type: "t" });
});

Deno.test("error helpers read the JSON:API envelope", () => {
  const body = {
    errors: [{
      status: "422",
      code: "x",
      title: "Invalid",
      detail: "bad",
      source: { pointer: "/a" },
    }],
  };
  assertEquals(errorText(body), "Invalid: bad (/a)");
  assertEquals(errorCode(body), "x");
  assertEquals(isErrorEnvelope(body), true);
  assertEquals(isErrorEnvelope({ errors: [] }), false);
  assertEquals(isErrorEnvelope({ message: "no" }), false);
  assertEquals(errorText({}), undefined);
  assertEquals(errorCode({}), undefined);
});

Deno.test("omitKeys: removes only the named keys", () => {
  assertEquals(omitKeys({ a: 1, b: 2 }, ["b", "zz"]), { a: 1 });
});

Deno.test("client.one: an empty 2xx body is { ok: true }; a collection is refused", async () => {
  const a = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new ProductiveClient(a.ctx).one("/x"), { ok: true });
  const b = mockCtx([{ status: 200, body: { data: [] } }]);
  let msg = "";
  try {
    await new ProductiveClient(b.ctx).one("/x");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("expected a single resource"), true);
});

Deno.test("client.one: side-loaded resources come back flattened under included", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: { id: "1", type: "tasks", attributes: { title: "t" } },
      included: [{ id: "9", type: "projects", attributes: { name: "P" } }],
    },
  }]);
  const out = await new ProductiveClient(ctx).one("/tasks/1");
  assertEquals(out.included, [{ name: "P", id: "9", type: "projects" }]);
});

Deno.test("client.many: page metadata, cursor and included", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: [{ id: "1", type: "t", attributes: {} }],
      included: [{ id: "2", type: "u", attributes: {} }],
      meta: { total_count: 5, total_pages: 5, current_page: 1, page_size: 1 },
      links: { next: "https://api.productive.io/api/v2/t?page[after]=zz" },
    },
  }]);
  const out = await new ProductiveClient(ctx).many("/t");
  assertEquals(out.totalCount, 5);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextCursor, "zz");
  assertEquals((out.included as unknown[]).length, 1);
});

Deno.test("client.many: a non-collection answer is refused", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: {} } }]);
  let msg = "";
  try {
    await new ProductiveClient(ctx).many("/t");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("expected a JSON:API collection"), true);
});

Deno.test("client: every request sends the JSON:API content type and no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new ProductiveClient(ctx).remove("/tasks/1", 1);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept", "content-type"]);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("client: a 429 names the rate-limit window; a non-JSON error shows the text", async () => {
  const a = mockCtx([{
    status: 429,
    body: errorBody("429", "rate_limit", "Too Many Requests"),
    headers: { "x-ratelimit-reset": "7" },
  }]);
  let msg = "";
  try {
    await new ProductiveClient(a.ctx).many("/t");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Productive 429: Too Many Requests (window resets in 7s)");

  const b = mockCtx([{ status: 502, body: "Bad gateway" }]);
  try {
    await new ProductiveClient(b.ctx).many("/t");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Productive 502: Bad gateway");
});

Deno.test("client: a 2xx that is not JSON is an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>" }]);
  let msg = "";
  try {
    await new ProductiveClient(ctx).many("/t");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Productive 200: response was not JSON");
});
