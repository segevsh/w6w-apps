import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /webhook/{id} returns the remaining list", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ webhookId: 2, secret: "s" }] }]);
  const out = await webhookDelete.execute({ webhookId: 188 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhook/188");
  assertEquals(out, { items: [{ webhookId: 2 }] });
});

Deno.test("webhook-delete: id must be a positive integer", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await webhookDelete.execute({ webhookId: -1 }, ctx),
    Error,
    "positive integer",
  );
});
