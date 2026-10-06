import { assertEquals } from "@std/assert";
import a from "../../actions/list-users.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("list-users: GET users.list with email filter and paging", async () => {
  const { call, query } = await run(a, {
    email: "a@b.io",
    count: 10,
    offset: 5,
    sort: '{"username":1}',
  });
  assertEquals(call.url.split("?")[0], `${BASE}/users.list`);
  assertEquals(query.get("email"), "a@b.io");
  assertEquals(query.get("count"), "10");
  assertEquals(query.get("sort"), '{"username":1}');
});

Deno.test("list-users: never sends the deprecated query/fields params", async () => {
  const { query } = await run(a, {});
  assertEquals(query.has("query") || query.has("fields"), false);
});
