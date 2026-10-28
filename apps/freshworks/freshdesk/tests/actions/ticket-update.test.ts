import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

Deno.test("ticket-update: PUTs /tickets/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 1, status: 4 } }]);
  await action.execute({ ticketId: 1, status: 4 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: 4 });
});

Deno.test("ticket-update: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
