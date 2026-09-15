import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs /webhook with the documented field names", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: 1, event: "document.processed", target: "https://x/webhook" } },
  ]);
  const out = await webhookCreate.execute(
    { event: "document.processed", target: "https://x/webhook", name: "My hook" },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/webhook");
  assertEquals(JSON.parse(calls[0].body!), {
    event: "document.processed",
    target: "https://x/webhook",
    name: "My hook",
  });
  assertEquals(out.id, 1);
});

Deno.test("webhook-create: parserFieldSet accepts a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 2 } }]);
  await webhookCreate.execute(
    { event: "table.processed", target: "https://x/webhook", parserFieldSet: "PF1, PF2" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!).parser_field_set, ["PF1", "PF2"]);
});

Deno.test("webhook-create: has NO idempotency-key mechanism, unlike Apify's webhooks", () => {
  assertEquals(webhookCreate.idempotent, false);
});
