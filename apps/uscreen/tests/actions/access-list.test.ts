import { assert, assertEquals } from "@std/assert";
import accessList from "../../actions/access-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("access-list: sends GET /customers/${seg(input.customerId)}/accesses and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 9, "product_id": 3 }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await accessList.execute(
    { "customerId": "5", "page": 1 } as never,
    ctx,
  ) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/accesses");
  assertEquals(queryOf(calls[0].url), { "page": "1" });
  assertEquals(out.items, [{ "id": 9, "product_id": 3 }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("access-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await accessList.execute(
    { "customerId": "5", "page": 1 } as never,
    ctx,
  ) as unknown as { hasMore: boolean; nextPage: number | null };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
