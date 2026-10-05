import { assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PATCH /api/v1/webhook/w1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { webhook: { id: "w1", url: "https://h.test/x", status: "active", secret: "s3" } },
  }]);
  const out = await webhookUpdate.execute({
    webhookId: "w1",
    status: "inactive",
    enabledEvents: "action_item.completed,action_item.assigned",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhook/w1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), {
    enabled_events: ["action_item.completed", "action_item.assigned"],
    status: "inactive",
  });
  assertEquals((out as { id: string }).id, "w1");
});

Deno.test("webhook-update: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        webhookUpdate.execute({
          webhookId: "w1",
          status: "inactive",
          enabledEvents: "action_item.completed,action_item.assigned",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
