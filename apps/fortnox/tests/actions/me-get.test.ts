import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/me-get.ts";

Deno.test("me-get: GET /3/me with its query", async () => {
  const reply = { "Me": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/me");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
