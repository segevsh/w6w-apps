import { assert, assertEquals } from "@std/assert";
import contentList from "../../actions/content-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("content-list: sends GET /contents and reads pagination from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 1, "title": "Intro" }],
    headers: {
      "content-type": "application/json",
      "total-count": "41",
      link:
        '<https://uscreen.io/publisher_api/v1/x?page=3>; rel="next", <https://uscreen.io/publisher_api/v1/x?page=5>; rel="last"',
    },
  }]);
  const out = await contentList.execute(
    { "contentType": "video", "include": "author" } as never,
    ctx,
  ) as unknown as {
    items: unknown[];
    totalCount: number | null;
    nextPage: number | null;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents");
  assertEquals(queryOf(calls[0].url), { "content_type": "video", "include": "author" });
  assertEquals(out.items, [{ "id": 1, "title": "Intro" }]);
  assertEquals(out.totalCount, 41);
  assertEquals(out.nextPage, 3);
  assertEquals(out.hasMore, true);
});

Deno.test("content-list: last page has no next link", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: { "content-type": "application/json", "total-count": "0" },
  }]);
  const out = await contentList.execute(
    { "contentType": "video", "include": "author" } as never,
    ctx,
  ) as unknown as { hasMore: boolean; nextPage: number | null };
  assert(!out.hasMore);
  assertEquals(out.nextPage, null);
});
