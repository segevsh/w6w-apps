import { assert, assertEquals } from "@std/assert";
import action from "../../actions/query-data-items.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("query-data-items: POSTs to /wix-data/v2/items/query with only the collection id", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataItems: [] } }]);
  await action.execute!({ dataCollectionId: "Cities" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/items/query");
  // Optional inputs must be absent, not null — Wix validates bodies strictly.
  assertEquals(JSON.parse(calls[0].body!), { dataCollectionId: "Cities", query: {} });
});

Deno.test("query-data-items: nests filter, sort, fields and paging under `query`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    dataCollectionId: "Cities",
    filter: { state: "California" },
    sortFieldName: "population",
    sortOrder: "DESC",
    fields: "population, name",
    limit: 2,
    offset: 4,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    dataCollectionId: "Cities",
    query: {
      filter: { state: "California" },
      sort: [{ fieldName: "population", order: "DESC" }],
      fields: ["population", "name"],
      paging: { limit: 2, offset: 4 },
    },
  });
});

Deno.test("query-data-items: sort defaults to ASC when only a field is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "Cities", sortFieldName: "name" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query.sort, [{ fieldName: "name", order: "ASC" }]);
});

Deno.test("query-data-items: sends no sort at all when no field is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "Cities", sortOrder: "DESC" }, ctx);
  assert(!("sort" in JSON.parse(calls[0].body!).query));
});

Deno.test("query-data-items: carries returnTotalCount and consistentRead at the top level", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { dataCollectionId: "Cities", returnTotalCount: true, consistentRead: true },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.returnTotalCount, true);
  assertEquals(sent.consistentRead, true);
});

Deno.test("query-data-items: returns the body and is a search action", async () => {
  const body = { dataItems: [{ _id: "1" }], pagingMetadata: { count: 1 } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ dataCollectionId: "Cities" }, ctx), body);
  assertEquals(action.type, "search");
});
