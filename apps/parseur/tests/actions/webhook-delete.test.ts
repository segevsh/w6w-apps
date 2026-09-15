import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs /webhook/{id} and tolerates a text/html success body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: "", headers: { "content-type": "text/html" } },
  ]);
  const out = await webhookDelete.execute({ webhookId: "9" }, ctx) as {
    webhookId: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhook/9");
  assertEquals(out, { webhookId: "9", status: 200 });
});

Deno.test("webhook-delete: is idempotent", () => {
  assertEquals(webhookDelete.idempotent, true);
});
