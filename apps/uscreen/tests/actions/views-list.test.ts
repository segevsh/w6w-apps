import { assert, assertEquals } from "@std/assert";
import viewsList from "../../actions/views-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("views-list: sends GET /analytics/videos/views and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "content_title": "Intro", "content_id": 1, "user_id": 2, "duration": 30 }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await viewsList.execute(
    {
      "userId": "a@b.co",
      "contentId": "77",
      "perPage": 20,
      "page": 2,
      "from": "2026-01-01T00:00:00Z",
    } as never,
    ctx,
  ) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/analytics/videos/views");
  assertEquals(queryOf(calls[0].url), {
    "user_id": "a@b.co",
    "content_id": "77",
    "per_page": "20",
    "page": "2",
    "from": "2026-01-01T00:00:00Z",
  });
  assertEquals(out.items, [{
    "content_title": "Intro",
    "content_id": 1,
    "user_id": 2,
    "duration": 30,
  }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("views-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await viewsList.execute(
    {
      "userId": "a@b.co",
      "contentId": "77",
      "perPage": 20,
      "page": 2,
      "from": "2026-01-01T00:00:00Z",
    } as never,
    ctx,
  ) as unknown as { hasMore: boolean; nextPage: number | null };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
