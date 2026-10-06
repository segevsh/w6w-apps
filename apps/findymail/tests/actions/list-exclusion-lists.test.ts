import { assertEquals } from "@std/assert";
import action from "../../actions/list-exclusion-lists.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-exclusion-lists: GETs the exclusion lists", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "lists": [{ "id": 1, "name": "Competitors" }] },
  }]);
  const out = await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/exclusion-lists");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "lists": [{ "id": 1, "name": "Competitors" }] });
});
