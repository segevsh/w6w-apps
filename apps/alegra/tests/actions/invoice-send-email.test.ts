import { assertEquals } from "@std/assert";
import invoiceSendEmail from "../../actions/invoice-send-email.ts";
import { assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-send-email: POST /invoices/:id/email with a recipient array and options", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200 } }]);
  await invoiceSendEmail.execute({
    id: "3",
    emails: "a@x.com, b@x.com ,",
    sendCopyToUser: true,
    asCopy: true,
    subject: "Your invoice",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/invoices/3/email");
  assertEquals(bodyOf(calls[0]), {
    emails: ["a@x.com", "b@x.com"],
    sendCopyToUser: true,
    invoiceType: "copy",
    emailMessage: { subject: "Your invoice" },
  });
});

Deno.test("invoice-send-email: defaults send only the recipients (original document)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await invoiceSendEmail.execute({ id: "3", emails: "a@x.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { emails: ["a@x.com"] });
});

Deno.test("invoice-send-email: no recipient fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => invoiceSendEmail.execute({ id: "3", emails: " , " }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
