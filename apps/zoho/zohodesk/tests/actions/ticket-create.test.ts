import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-create.ts";

test("ticket-create: POSTs /tickets with the parsed fields body", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  const out = await action.execute(
    { fields: { subject: "Cannot log in", departmentId: "123" } },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(JSON.parse(calls[0].body!), { subject: "Cannot log in", departmentId: "123" });
  assertEquals(out, { id: "1" });
});

test("ticket-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
