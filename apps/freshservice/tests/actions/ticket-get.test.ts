import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get.ts";

Deno.test("ticket-get: GETs the ticket and unwraps it", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: { id: 20 } } }]);
  const out = await action.execute({ ticketId: 20 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/20");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 20 });
});

Deno.test("ticket-get: joins the embed multiselect into one `include` param", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: {} } }]);
  await action.execute({ ticketId: 20, include: ["requester", "stats"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.freshservice.com/api/v2/tickets/20?include=requester%2Cstats",
  );
});

Deno.test("ticket-get: omits `include` entirely when nothing is selected", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: {} } }]);
  await action.execute({ ticketId: 20, include: [] }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/20");
});
