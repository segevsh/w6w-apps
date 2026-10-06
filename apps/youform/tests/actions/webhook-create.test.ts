import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /api/webhooks with form_id and webhook_url in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 9 } } }]);
  const out = await webhookCreate.execute(
    { form: "kyir3qrg", webhook_url: "https://example.com/hook?a=1&b=2" },
    ctx,
  ) as { data: { id: number } };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/webhooks");
  assertEquals(queryOf(calls[0].url), {
    form_id: "kyir3qrg",
    webhook_url: "https://example.com/hook?a=1&b=2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.data.id, 9);
  assertEquals(webhookCreate.idempotent, false);
});

Deno.test("webhook-create: 422 field errors are flattened into the message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("The given data was invalid.", { webhook_url: ["must be https"] }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookCreate.execute({ form: "f", webhook_url: "http://x" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("webhook_url: must be https"), true, err.message);
});
