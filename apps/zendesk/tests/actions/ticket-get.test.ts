import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get.ts";

Deno.test("ticket-get: GETs /tickets/{id}.json", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: { id: 7 } } }]);
  assertEquals(await action.execute({ ticketId: 7 }, ctx), { ticket: { id: 7 } });
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/tickets/7.json");
});
