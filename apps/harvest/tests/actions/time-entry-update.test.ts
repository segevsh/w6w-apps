import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-update.ts";

Deno.test("time-entry-update: PATCHes /time_entries/{id} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, hours: 3 } }]);
  await action.execute({ timeEntryId: "1", hours: 3, notes: "updated" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries/1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { hours: 3, notes: "updated" });
});

Deno.test("time-entry-update: an empty update sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ timeEntryId: "1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
