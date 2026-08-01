import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/media-list.ts";

const display = { endpoint: "https://example.com" };

Deno.test("media-list: GETs the paginated Media Library endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [], pagination: { page: 1 } } }], {
    display,
  });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/upload/files/page");
  assertEquals(result, { results: [], pagination: { page: 1 } });
});

Deno.test("media-list: forwards page/pageSize", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { display });
  await action.execute({ page: 3, pageSize: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pagination[page]"), "3");
  assertEquals(url.searchParams.get("pagination[pageSize]"), "5");
});
