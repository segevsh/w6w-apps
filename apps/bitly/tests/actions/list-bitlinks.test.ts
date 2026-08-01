import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-bitlinks.ts";

Deno.test("list-bitlinks: GETs /groups/{groupGuid}/bitlinks and unwraps links + pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      links: [{ id: "bit.ly/a1", link: "https://bit.ly/a1", long_url: "https://a.com" }],
      pagination: { search_after: "cursor-1" },
    },
  }]);
  const out = await action.execute({ groupGuid: "Ba1bc23dE4F" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/groups/Ba1bc23dE4F/bitlinks");
  assertEquals(url.searchParams.get("size"), "50");
  assertEquals(out.items.length, 1);
  assertEquals(out.nextSearchAfter, "cursor-1");
});

Deno.test("list-bitlinks: passes query, archived and searchAfter through", async () => {
  const { ctx, calls } = mockCtx([{ body: { links: [] } }]);
  const out = await action.execute({
    groupGuid: "Ba1bc23dE4F",
    query: "widget",
    archived: true,
    size: 10,
    searchAfter: "cursor-0",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "widget");
  assertEquals(url.searchParams.get("archived"), "true");
  assertEquals(url.searchParams.get("size"), "10");
  assertEquals(url.searchParams.get("search_after"), "cursor-0");
  assertEquals(out.nextSearchAfter, undefined);
});
