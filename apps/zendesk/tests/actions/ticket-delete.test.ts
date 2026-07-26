import { assert, assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-delete.ts";

Deno.test("ticket-delete: DELETEs the ticket", async () => {
  const { ctx, calls } = mockZendeskCtx([{ status: 204 }]);
  await action.execute({ ticketId: 7 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/tickets/7.json");
});

Deno.test("ticket-delete: says plainly that it is a soft delete", () => {
  assert(action.description?.includes("Soft-delete"));
});
