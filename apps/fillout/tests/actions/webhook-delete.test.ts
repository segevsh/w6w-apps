import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: POSTs to /v1/api/webhook/delete with webhookId in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await webhookDelete.execute({ webhookId: "4211" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/webhook/delete");
  assertEquals(JSON.parse(calls[0].body!), { webhookId: "4211" });
  assertEquals(out.webhookId, "4211");
});

/**
 * The other half of the type flip: Create returns an integer, so the integer is
 * what a workflow will wire straight into this action. Coercing it here is what
 * stops the delete schema rejecting the id it just issued.
 */
Deno.test("webhook-delete: the integer Create returned is coerced to the string Delete declares", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookDelete.execute({ webhookId: 4211 }, ctx);
  const sent = JSON.parse(calls[0].body!) as { webhookId: unknown };
  assertEquals(sent.webhookId, "4211");
  assertEquals(typeof sent.webhookId, "string");
});

Deno.test("webhook-delete: an empty id is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(webhookDelete.execute({ webhookId: "  " }, ctx)),
    Error,
  );
  assertEquals(err.message, "Webhook ID is required");
  assertEquals(calls.length, 0);
});

Deno.test("webhook-delete: is idempotent — the same end state after a retry", () => {
  assertEquals(webhookDelete.idempotent, true);
});
