import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-send.ts";

test("invoice-send: marks as sent when no recipients are given", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { invoice: {} } } } }]);
  await action.execute({ invoiceId: "325" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { invoice: { action_mark_as_sent: true } });
});

test("invoice-send: emails the given recipients instead of just marking as sent", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({ invoiceId: "325", emailRecipients: ["client@example.com"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    invoice: { action_email: true, email_recipients: ["client@example.com"] },
  });
});
