import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs the webhook's path and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await webhookDelete.execute({ webhookId: "507f191e810c19729de860ea" }, ctx) as {
    webhookId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/api/webhooks/507f191e810c19729de860ea`);
  assertEquals(result.status, 204);
});

Deno.test("webhook-delete: declared idempotent — the subscription stays gone on a retry", () => {
  assertEquals(webhookDelete.idempotent, true);
});
