import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-posts-by-author.ts";

Deno.test("list-posts-by-author: FINDER query for a person author", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [], paging: {} } }]);
  await action.execute!({ authorType: "person", authorId: "abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/posts");
  assertEquals(url.searchParams.get("q"), "author");
  assertEquals(url.searchParams.get("author"), "urn:li:person:abc123");
  assertEquals(url.searchParams.get("count"), "10");
  assertEquals(url.searchParams.get("start"), "0");
  assertEquals(url.searchParams.get("sortBy"), "LAST_MODIFIED");
  assertEquals(calls[0].headers["x-restli-method"], "FINDER");
});

Deno.test("list-posts-by-author: builds an organization URN and honors overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await action.execute!(
    {
      authorType: "organization",
      authorId: "5515715",
      count: 25,
      start: 10,
      sortBy: "CREATED",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("author"), "urn:li:organization:5515715");
  assertEquals(url.searchParams.get("count"), "25");
  assertEquals(url.searchParams.get("start"), "10");
  assertEquals(url.searchParams.get("sortBy"), "CREATED");
});
