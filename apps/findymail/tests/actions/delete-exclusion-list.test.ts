import { assertEquals } from "@std/assert";
import action from "../../actions/delete-exclusion-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-exclusion-list: DELETEs the list by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "success": true } }]);
  const out = await action.execute!({ "id": 3 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/exclusion-lists/3");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "success": true });
});
