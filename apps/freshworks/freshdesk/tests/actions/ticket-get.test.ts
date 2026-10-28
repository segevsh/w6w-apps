import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get.ts";

Deno.test("ticket-get: GETs /tickets/:id", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 7, subject: "s" } }]);
  const out = await action.execute({ ticketId: 7 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 7, subject: "s" });
});

Deno.test("ticket-get: joins include into a comma-separated query param", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute({ ticketId: 7, include: ["stats", "requester"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.freshdesk.com/api/v2/tickets/7?include=stats%2Crequester",
  );
});

Deno.test("ticket-get: omits include when empty", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute({ ticketId: 7, include: [] }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets/7");
});
