import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-create.ts";

Deno.test("ticket-create: POSTs /tickets.json with the ticket envelope", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: { id: 1 } } }]);
  await action.execute({ subject: "Broken", description: "It broke" }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/tickets.json");
  assertEquals(JSON.parse(calls[0].body!), {
    ticket: { subject: "Broken", comment: { body: "It broke" } },
  });
});

Deno.test("ticket-create: nests the requester only when an email is given", async () => {
  const withEmail = mockZendeskCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", requesterEmail: "jo@acme.test", requesterName: "Jo" },
    withEmail.ctx,
  );
  assertEquals(JSON.parse(withEmail.calls[0].body!).ticket.requester, {
    email: "jo@acme.test",
    name: "Jo",
  });

  const without = mockZendeskCtx([{ body: {} }]);
  await action.execute({ subject: "s", description: "d" }, without.ctx);
  assertEquals("requester" in JSON.parse(without.calls[0].body!).ticket, false);
});

Deno.test("ticket-create: converts the custom-field map into Zendesk's id/value array", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", customFields: { "360001": "vip" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).ticket.custom_fields, [
    { id: 360001, value: "vip" },
  ]);
});

Deno.test("ticket-create: splits tags on commas", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: {} }]);
  await action.execute({ subject: "s", description: "d", tags: "vip, urgent" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ticket.tags, ["vip", "urgent"]);
});
