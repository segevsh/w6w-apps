import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-sites.ts";

test("list-sites: GETs /v2/sites and returns the response verbatim", async () => {
  const body = { sites: [{ id: "s1", displayName: "Blog" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/sites");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
