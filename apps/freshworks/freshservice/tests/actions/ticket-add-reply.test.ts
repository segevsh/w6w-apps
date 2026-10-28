import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-reply.ts";

Deno.test("ticket-add-reply: POSTs /tickets/{id}/reply and unwraps `conversation`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { conversation: { id: 11 } } }]);
  const out = await action.execute({ ticketId: 141, body: "<p>on it</p>" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/141/reply");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "<p>on it</p>" });
  assertEquals(out, { id: 11 });
});

Deno.test("ticket-add-reply: maps fromEmail and the copy lists", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute(
    { ticketId: 1, body: "b", fromEmail: "help@acme.test", ccEmails: "a@b.c", bccEmails: "d@e.f" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.from_email, "help@acme.test");
  assertEquals(body.cc_emails, ["a@b.c"]);
  assertEquals(body.bcc_emails, ["d@e.f"]);
});
