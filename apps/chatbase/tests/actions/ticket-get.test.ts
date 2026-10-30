import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import ticketGet from "../../actions/ticket-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("ticket-get: GET .../tickets/{ticketNumber}, numeric in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { ticketNumber: 123, subject: "Export failing" } }]);
  const out = await ticketGet.execute({ agentId: "a1", ticketNumber: 123 }, ctx) as {
    subject: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets/123");
  assertEquals(out.subject, "Export failing");
});
