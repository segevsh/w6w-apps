import { assert, assertEquals } from "@std/assert";
import offerList from "../../actions/offer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offer-list: sends GET /offers and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 3, "title": "Pro" }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await offerList.execute({} as never, ctx) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/offers");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.items, [{ "id": 3, "title": "Pro" }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("offer-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await offerList.execute({} as never, ctx) as unknown as {
    hasMore: boolean;
    nextPage: number | null;
  };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
