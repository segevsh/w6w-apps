import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-delete.ts";

Deno.test("ticket-delete: DELETEs /tickets/:id and reports success", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ status: 204 }]);
  const out = await action.execute({ ticketId: 9 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});
