import { assertEquals } from "@std/assert";
import action from "../../actions/update-exclusion-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-exclusion-list: PUTs the new name", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "list": { "id": 3, "name": "New" } },
  }]);
  const out = await action.execute!({ "id": 3, "name": "New" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/exclusion-lists/3");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "name": "New" });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "success": true, "list": { "id": 3, "name": "New" } });
});
