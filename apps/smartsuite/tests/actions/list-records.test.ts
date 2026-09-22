import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-records.ts";

Deno.test("list-records: POSTs to records/list/ with paging query and a sort/filter body", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 1, offset: 0, limit: 50, items: [] } }]);
  const result = await action.execute!(
    {
      tableId: "tbl1",
      offset: 50,
      limit: 50,
      all: true,
      sort: [{ field: "name", direction: "asc" }],
      filter: { operator: "and", fields: [] },
      hydrated: true,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/applications/tbl1/records/list/");
  assertEquals(url.searchParams.get("offset"), "50");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("all"), "true");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    sort: [{ field: "name", direction: "asc" }],
    filter: { operator: "and", fields: [] },
    hydrated: true,
  });
  assertEquals(result, { total: 1, offset: 0, limit: 50, items: [] });
});

Deno.test("list-records: defaults limit to 100 and omits absent optional params", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ tableId: "tbl1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(url.searchParams.has("all"), false);
  assertEquals(JSON.parse(calls[0].body!), {});
});
