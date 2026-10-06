import { assert, assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: sends GET /customers and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 1, "email": "a@b.co" }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await customerList.execute(
    { "dateField": "updated_at", "from": "2026-01-01T00:00:00Z" } as never,
    ctx,
  ) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers");
  assertEquals(queryOf(calls[0].url), {
    "date_field": "updated_at",
    "from": "2026-01-01T00:00:00Z",
  });
  assertEquals(out.items, [{ "id": 1, "email": "a@b.co" }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("customer-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await customerList.execute(
    { "dateField": "updated_at", "from": "2026-01-01T00:00:00Z" } as never,
    ctx,
  ) as unknown as { hasMore: boolean; nextPage: number | null };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
