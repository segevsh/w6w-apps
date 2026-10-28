import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-create.ts";

Deno.test("ticket-create: POSTs /tickets with the ticket fields", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 1 } }]);
  await action.execute({ subject: "Broken", description: "It broke" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { subject: "Broken", description: "It broke" });
});

Deno.test("ticket-create: sends requesterEmail as email and requesterId as requester_id", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", requesterEmail: "jo@acme.test" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).email, "jo@acme.test");

  const withId = mockFreshdeskCtx([{ body: {} }]);
  await action.execute({ subject: "s", description: "d", requesterId: 42 }, withId.ctx);
  assertEquals(JSON.parse(withId.calls[0].body!).requester_id, 42);
});

Deno.test("ticket-create: splits tags and ccEmails on commas", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", tags: "vip, urgent", ccEmails: "a@b.c, d@e.f" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip", "urgent"]);
  assertEquals(JSON.parse(calls[0].body!).cc_emails, ["a@b.c", "d@e.f"]);
});

Deno.test("ticket-create: parses the custom-fields JSON param", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", customFields: { product: "CRM" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).custom_fields, { product: "CRM" });
});
