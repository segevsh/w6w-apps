import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-delete.ts";

Deno.test("time-off-delete: DELETEs and reports what went", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ timeOffId: "to1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: "to1", deleted: true });
});

Deno.test("time-off-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`timeOffId`");
  assertEquals(calls.length, 0);
});
