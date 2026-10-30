import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-restore.ts";

test("ticket-restore: PUTs the restore path with no body", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ status: 204 }]);
  const out = await action.execute({ ticketId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/3/restore");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});
