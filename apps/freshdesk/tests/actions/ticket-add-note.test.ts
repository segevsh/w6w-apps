import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-note.ts";

Deno.test("ticket-add-note: POSTs /tickets/:id/notes, private by default", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 5, body: "internal" } }]);
  await action.execute({ ticketId: 3, body: "internal" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/3/notes");
  assertEquals(JSON.parse(calls[0].body!), { body: "internal", private: true });
});

Deno.test("ticket-add-note: honors private: false and splits notifyEmails", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute(
    { ticketId: 3, body: "note", private: false, notifyEmails: "a@b.c, d@e.f" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    body: "note",
    private: false,
    notify_emails: ["a@b.c", "d@e.f"],
  });
});
