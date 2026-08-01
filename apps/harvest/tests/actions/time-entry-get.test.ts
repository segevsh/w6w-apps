import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get.ts";

Deno.test("time-entry-get: GETs /time_entries/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, hours: 2.5 } }]);
  const result = await action.execute({ timeEntryId: "123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries/123");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 123, hours: 2.5 });
});
