import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import webhookCreate from "../../actions/webhook-create.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

Deno.test("webhook-create: POSTs event, url and handshake key", async () => {
  const hook = { event: "result_completed", url: "https://h", handshake_key: "K" };
  const { ctx, calls } = mockFormsiteCtx([{ body: { webhook: hook } }]);
  const out = await webhookCreate.execute(
    { formDir: "f1", url: "https://h", handshakeKey: "K" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, B + "/forms/f1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), hook);
  assertEquals(out, { webhook: hook });
});

Deno.test("webhook-create: omits a blank handshake key", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }]);
  const out = await webhookCreate.execute(
    { formDir: "f1", url: "https://h", handshakeKey: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { event: "result_completed", url: "https://h" });
  assertEquals(out, { webhook: null });
  assertEquals(webhookCreate.idempotent, true);
});
