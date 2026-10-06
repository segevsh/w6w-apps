import { assertEquals } from "@std/assert";
import recordList from "../../actions/record-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("record-list: GET /records with every filter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "r1" }]) }]);
  const out = await recordList.execute(
    {
      page: 0,
      pageSize: 10,
      types: "contract",
      search: "acme",
      sortField: "name",
      sortDirection: "ASC",
      addressAsObject: true,
    },
    ctx,
  ) as { count: number };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records");
  assertEquals(queryOf(calls[0].url), {
    page: "0",
    pageSize: "10",
    types: "contract",
    search: "acme",
    sortField: "name",
    sortDirection: "ASC",
    addressAsObject: "true",
  });
  assertEquals(out.count, 1);
});

Deno.test("record-list: page 0 is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await recordList.execute({ page: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "0" });
});
