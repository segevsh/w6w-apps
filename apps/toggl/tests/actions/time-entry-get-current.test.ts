import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get-current.ts";

Deno.test("time-entry-get-current: GETs /me/time_entries/current", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, duration: -1 } }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/me/time_entries/current");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 1, duration: -1 });
});

Deno.test("time-entry-get-current: a null body (no running entry) passes through", async () => {
  const { ctx } = mockCtx([{ body: "null", headers: { "content-type": "application/json" } }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, null);
});
