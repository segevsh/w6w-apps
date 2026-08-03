import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-note.ts";

Deno.test("ticket-add-note: POSTs /tickets/{id}/notes and unwraps `conversation`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { conversation: { id: 9 } } }]);
  const out = await action.execute({ ticketId: 4, body: "<p>looking</p>" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/4/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { id: 9 });
});

Deno.test("ticket-add-note: defaults to private, matching Freshservice's own default", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ ticketId: 4, body: "b" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).private, true);

  const pub = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ ticketId: 4, body: "b", private: false }, pub.ctx);
  assertEquals(JSON.parse(pub.calls[0].body!).private, false);
});

Deno.test("ticket-add-note: splits notifyEmails on commas", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ ticketId: 4, body: "b", notifyEmails: "a@b.c, d@e.f" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).notify_emails, ["a@b.c", "d@e.f"]);
});
