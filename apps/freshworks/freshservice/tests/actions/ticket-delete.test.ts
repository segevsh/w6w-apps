import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-delete.ts";

Deno.test("ticket-delete: DELETEs the ticket and reports success on a 204", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ status: 204 }]);
  const out = await action.execute({ ticketId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/3");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});
