import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-send.ts";

Deno.test("invoice-send: posts to /send with subject and note, defaulting send_to_recipient true", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: {} } }]);
  await action.execute!({ invoiceId: "INV-1", subject: "Invoice due", note: "Please pay" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/invoicing/invoices/INV-1/send");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.subject, "Invoice due");
  assertEquals(body.note, "Please pay");
  assertEquals(body.send_to_recipient, true);
  assertEquals(body.send_to_invoicer, false);
});

Deno.test("invoice-send: additionalFields override the send flags", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      invoiceId: "INV-1",
      additionalFields: { sendToRecipient: false, sendToInvoicer: true },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.send_to_recipient, false);
  assertEquals(body.send_to_invoicer, true);
});

Deno.test("invoice-send: invoiceId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ invoiceId: "" }, ctx)),
    Error,
    "`invoiceId`",
  );
  assertEquals(calls.length, 0);
});
