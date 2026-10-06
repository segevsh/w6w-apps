import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("webhook-delete: calls DELETE /webhooks/subscriptions/w1 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await webhookDelete.execute({ "id": "w1" } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/webhooks/subscriptions/w1`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": "w1", "status": 200 });
});

Deno.test("webhook-delete: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await webhookDelete.execute({ "id": "w1" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
