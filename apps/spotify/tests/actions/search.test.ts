import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs /search with joined types and defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { tracks: { items: [] } } }]);
  await action.execute({ query: "daft punk", types: ["track", "album"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/search");
  assertEquals(url.searchParams.get("q"), "daft punk");
  assertEquals(url.searchParams.get("type"), "track,album");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("search: passes market and custom limit/offset through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { query: "x", types: ["artist"], market: "US", limit: 10, offset: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("market"), "US");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "5");
});
