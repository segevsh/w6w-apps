import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/media-list.ts";

const display = { endpoint: "https://example.com" };

test("media-list: GETs the paginated Media Library endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [], pagination: { page: 1 } } }], {
    display,
  });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/upload/files/page");
  assertEquals(result, { results: [], pagination: { page: 1 } });
});

test("media-list: forwards page/pageSize", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { display });
  await action.execute({ page: 3, pageSize: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pagination[page]"), "3");
  assertEquals(url.searchParams.get("pagination[pageSize]"), "5");
});
