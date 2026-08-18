import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/maintenance-window-delete.ts";

/** The other half of a deploy workflow: end the window once verified. */
Deno.test("maintenance-window-delete: DELETEs the window", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ windowId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/maintenance-windows/1");
  assertEquals(result, { windowId: "1", deleted: true });
});

Deno.test("maintenance-window-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`windowId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("restoring alerting"), action.description);
});
