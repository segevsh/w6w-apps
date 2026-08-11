import { assert, assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

Deno.test("webhook-create: POSTs scope, destination and custom headers", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 1 }) }]);
  const out = await webhookCreate.execute({
    scope: "store/order/created",
    destination: "https://example.com/hook",
    isActive: true,
    headers: '{"X-Callback-Secret":"s3cr3t"}',
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/hooks");
  assertEquals(bodyOf(calls[0]), {
    scope: "store/order/created",
    destination: "https://example.com/hook",
    is_active: true,
    headers: { "X-Callback-Secret": "s3cr3t" },
  });
  assertEquals(out.id, 1);
});

Deno.test("webhook-create: omits headers entirely when none are given", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await webhookCreate.execute({ scope: "store/order/*", destination: "https://x/y" }, ctx);
  assertEquals(Object.keys(bodyOf(calls[0]) as object).sort(), ["destination", "scope"]);
});

Deno.test("webhook-create: names all three delivery constraints", () => {
  // Each fails at delivery time, not at create time.
  const destination = webhookCreate.params?.find((p) => p.key === "destination");
  assert(destination?.hint?.includes("port 443"), destination?.hint);
  assert(destination?.hint?.includes("200"), destination?.hint);
  const active = webhookCreate.params?.find((p) => p.key === "isActive");
  assert(active?.hint?.includes("90 days"), active?.hint);
  assertEquals(webhookCreate.idempotent, false);
});
