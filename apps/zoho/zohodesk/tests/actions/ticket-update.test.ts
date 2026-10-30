import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

test("ticket-update: PATCHes /tickets/{id} with the parsed fields body", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "42", status: "Closed" } }]);
  const out = await action.execute({ recordId: "42", fields: { status: "Closed" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/42");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "Closed" });
  assertEquals(out, { id: "42", status: "Closed" });
});

test("ticket-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
