import { assertEquals } from "@std/assert";
import markActionDone from "../../actions/mark-action-done.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mark-action-done: PUT /actions/{id}/mark_as_done", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ action: { id: "a1", done: true } }) }]);
  const out = await markActionDone.execute({ actionId: "a1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/actions/a1/mark_as_done");
  assertEquals(calls[0].body, null);
  assertEquals(out.action, { id: "a1", done: true });
});
