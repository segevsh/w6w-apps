import { assertEquals } from "@std/assert";
import action from "../../actions/create-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-list: POSTs the name", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "list": { "id": 1, "name": "new list" } },
  }]);
  const out = await action.execute!({ "name": "new list" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "name": "new list" });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "list": { "id": 1, "name": "new list" } });
});
