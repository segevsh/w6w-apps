import { assertEquals } from "@std/assert";
import recordSearch from "../../actions/record-search.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-search: POSTs to .../records/search with the filter/sorting/paging body", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "rec1" }]) }]);
  const filter = { condition: { operator: "CONTAINS", leftSide: "fld1", rightSide: "acme" } };
  const sorting = [{ sortingField: "fld1", sortType: "ASC" }];

  const out = await recordSearch.execute(
    { databaseId: "db1", tableId: "tbl1", filter, sorting, offset: 0, limit: 25 },
    ctx,
  ) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    filter,
    sorting,
    paging: { offset: 0, limit: 25 },
  });
  assertEquals(out.data.length, 1);
});

/** All three body fields are documented optional; an empty body matches every record. */
Deno.test("record-search: an empty search body is valid — nothing is required", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await recordSearch.execute({ databaseId: "db1", tableId: "tbl1" }, ctx);
  // JSON.stringify drops undefined-valued keys, so an all-empty input serialises
  // to an empty paging object and no filter/sorting at all — still a valid body.
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { paging: {} });
});
