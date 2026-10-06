import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: DELETEs /hooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ id: "h1" }, ctx), { id: "h1", deleted: true });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/hooks/h1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(action.idempotent, true);
});

Deno.test("webhook-delete: id is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
});
