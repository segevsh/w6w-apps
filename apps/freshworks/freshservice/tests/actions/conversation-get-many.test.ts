import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/conversation-get-many.ts";

Deno.test("conversation-get-many: GETs the ticket's conversations", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { conversations: [{ id: 1 }] } }]);
  const out = await action.execute({ ticketId: 12 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/12/conversations");
  assertEquals(out, { conversations: [{ id: 1 }] });
});

Deno.test("conversation-get-many: paginates", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { conversations: [] } }]);
  await action.execute({ ticketId: 12, page: 2, perPage: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "100");
});
