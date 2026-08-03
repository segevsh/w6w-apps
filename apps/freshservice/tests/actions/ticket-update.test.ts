import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

Deno.test("ticket-update: PUTs only the fields the caller set", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: { id: 5, status: 4 } } }]);
  const out = await action.execute({ ticketId: 5, status: 4 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets/5");
  assertEquals(calls[0].method, "PUT");
  // Untouched fields must not be sent, or the PUT would blank them.
  assertEquals(JSON.parse(calls[0].body!), { status: 4 });
  assertEquals(out, { id: 5, status: 4 });
});

Deno.test("ticket-update: treats a blank string field as untouched", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ ticketId: 5, subject: "", category: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("ticket-update: is idempotent — the same PUT lands on the same state", () => {
  assertEquals(action.idempotent, true);
});
