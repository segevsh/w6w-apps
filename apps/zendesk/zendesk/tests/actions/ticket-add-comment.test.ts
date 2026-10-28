import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-comment.ts";

Deno.test("ticket-add-comment: a comment is a ticket PUT, not a comments POST", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: {} } }]);
  await action.execute({ ticketId: 7, body: "on it" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/tickets/7.json");
  assertEquals(JSON.parse(calls[0].body!), {
    ticket: { comment: { body: "on it", public: true } },
  });
});

Deno.test("ticket-add-comment: public:false survives into an internal note", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: {} }]);
  await action.execute({ ticketId: 7, body: "internal", public: false }, ctx);
  // The whole point of the field is the `false` case — it must not be dropped
  // as though it were unset.
  assertEquals(JSON.parse(calls[0].body!).ticket.comment.public, false);
});

Deno.test("ticket-add-comment: can move the ticket's status at the same time", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: {} }]);
  await action.execute({ ticketId: 7, body: "fixed", status: "solved" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ticket.status, "solved");
});
