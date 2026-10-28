import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-reply.ts";

Deno.test("ticket-add-reply: POSTs /tickets/:id/reply", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 8, body: "thanks!" } }]);
  await action.execute({ ticketId: 3, body: "thanks!" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/3/reply");
  assertEquals(JSON.parse(calls[0].body!), { body: "thanks!" });
});

Deno.test("ticket-add-reply: includes fromEmail, ccEmails and bccEmails when set", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute(
    {
      ticketId: 3,
      body: "thanks!",
      fromEmail: "support@acme.test",
      ccEmails: "a@b.c",
      bccEmails: "d@e.f",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    body: "thanks!",
    from_email: "support@acme.test",
    cc_emails: ["a@b.c"],
    bcc_emails: ["d@e.f"],
  });
});
