import { assertEquals } from "@std/assert";
import action from "../../actions/list-lists.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-lists: GETs /api/lists", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "lists": [{ "id": 1, "name": "my list" }] },
  }]);
  const out = await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/lists");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "lists": [{ "id": 1, "name": "my list" }] });
});
