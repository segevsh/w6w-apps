import { assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("webhook-update: PUTs the full subscription and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "507f191e810c19729de860ea" } }]);
  const result = await webhookUpdate.execute(
    {
      webhookId: "507f191e810c19729de860ea",
      url: "https://example.com/hook2",
      triggers: ["DELIVERY_REPORT"],
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/api/webhooks/507f191e810c19729de860ea`);
  assertEquals(bodyOf(calls[0]), {
    url: "https://example.com/hook2",
    triggers: ["DELIVERY_REPORT"],
  });
  assertEquals(result.id, "507f191e810c19729de860ea");
});

Deno.test("webhook-update: refuses an empty trigger list before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await webhookUpdate.execute(
        { webhookId: "x", url: "https://example.com/hook", triggers: [] },
        ctx,
      ),
    Error,
    "trigger",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-update: url and triggers are required — this is a whole-subscription write", () => {
  const url = webhookUpdate.params!.find((p) => p.key === "url");
  const triggers = webhookUpdate.params!.find((p) => p.key === "triggers");
  assertEquals(url?.required, true);
  assertEquals(triggers?.required, true);
});

Deno.test("webhook-update: declared idempotent — the same body twice is the same subscription", () => {
  assertEquals(webhookUpdate.idempotent, true);
});
