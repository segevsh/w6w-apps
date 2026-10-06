import { assert, assertEquals } from "@std/assert";
import invoiceList from "../../actions/invoice-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-list: sends GET /invoices and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": "i1", "amount": 1000 }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await invoiceList.execute(
    { "from": "2026-01-01T00:00:00Z" } as never,
    ctx,
  ) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/invoices");
  assertEquals(queryOf(calls[0].url), { "from": "2026-01-01T00:00:00Z" });
  assertEquals(out.items, [{ "id": "i1", "amount": 1000 }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("invoice-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await invoiceList.execute(
    { "from": "2026-01-01T00:00:00Z" } as never,
    ctx,
  ) as unknown as { hasMore: boolean; nextPage: number | null };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
