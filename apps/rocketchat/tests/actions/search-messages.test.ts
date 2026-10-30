import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import a from "../../actions/search-messages.ts";
import { BASE, run } from "../_helpers.ts";

test("search-messages: GET chat.search with roomId, searchText and paging", async () => {
  const { call, query } = await run(a, {
    roomId: "R",
    searchText: "from:bob deploy",
    count: 10,
    offset: 20,
  });
  assertEquals(call.url.split("?")[0], `${BASE}/chat.search`);
  assertEquals(query.get("roomId"), "R");
  assertEquals(query.get("searchText"), "from:bob deploy");
  assertEquals(query.get("count"), "10");
  assertEquals(query.get("offset"), "20");
});

test("search-messages: is a search action with both ids required", () => {
  assertEquals(a.type, "search");
  assertEquals(a.params?.filter((p) => p.required).map((p) => p.key), ["roomId", "searchText"]);
});
