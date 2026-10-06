import { assertEquals } from "@std/assert";
import a from "../../actions/list-channels.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("list-channels: GET channels.list with paging and sort, no query/fields", async () => {
  const { call, query } = await run(a, { count: 5, offset: 10, sort: '{"name":1}' });
  assertEquals(call.url.split("?")[0], `${BASE}/channels.list`);
  assertEquals(query.get("count"), "5");
  assertEquals(query.get("sort"), '{"name":1}');
  assertEquals(query.has("query") || query.has("fields"), false);
});

Deno.test("list-channels: joinedOnly switches to channels.list.joined", async () => {
  const { call } = await run(a, { joinedOnly: true });
  assertEquals(call.url, `${BASE}/channels.list.joined`);
});
