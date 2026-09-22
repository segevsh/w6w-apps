import { assertEquals } from "@std/assert";
import action from "../../actions/list-client-records.ts";
import { API_ROOT, mockCtx, page, pathOf, queryAllOf, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "rec-1", isActive: true }], { count: 1, hasMore: true });

Deno.test("list-client-records: reads /consultant/records and returns the envelope verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/records`);
  assertEquals(result, sample);
});

Deno.test("list-client-records: passes the documented filters through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    child: true,
    client: false,
    details: true,
    modified_eq: "2026-09-01T00:00:00Z",
    modified_gte: "2026-08-01T00:00:00Z",
    modified_lte: "2026-09-22T00:00:00Z",
    status: ["active", "archived"],
    after_id: "rec-1",
    limit: 25,
    skip: 10,
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.child, "true");
  // `false` is meaningful and must survive, not be dropped as "unset".
  assertEquals(query.client, "false");
  assertEquals(query.details, "true");
  assertEquals(query.modified_eq, "2026-09-01T00:00:00Z");
  assertEquals(query.modified_gte, "2026-08-01T00:00:00Z");
  assertEquals(query.modified_lte, "2026-09-22T00:00:00Z");
  assertEquals(query.after_id, "rec-1");
  assertEquals(query.limit, "25");
  assertEquals(query.skip, "10");
  // Array parameters are sent as repeated keys (the OpenAPI 3 default).
  assertEquals(queryAllOf(calls[0].url).status, ["active", "archived"]);
});

Deno.test("list-client-records: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-client-records: limit declares the documented 1-100 range", () => {
  const limit = action.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.validation, { integer: true, min: 1, max: 100 });
  assertEquals(limit.default, undefined, "the document declares no default");
});

Deno.test("list-client-records: a comma-typed multiselect is still split into repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({ status: "active,archived" }, ctx);
  assertEquals(queryAllOf(calls[0].url).status, ["active", "archived"]);
});

Deno.test("list-client-records: the list shape is the documented one", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "client-record");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
  assertEquals(pathOf(`${API_ROOT}/consultant/records`), "/consultant/records");
});
