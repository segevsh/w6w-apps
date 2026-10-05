import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs the endpoint", async () => {
  const body = { id: "whe_x", object: "webhook_endpoint", deleted: true };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await webhookDelete.execute({ webhookEndpointId: "whe_x" }, ctx), body);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhook-endpoints/whe_x");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-delete: 404 is an error and the action is not idempotent", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "gone" } }]);
  await assertRejects(
    async () => await webhookDelete.execute({ webhookEndpointId: "whe_x" }, ctx),
    Error,
    "404",
  );
  assertEquals(webhookDelete.idempotent, false);
});
