import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import opportunityCreate from "../../actions/opportunity-create.ts";
import { mockCtx } from "../_helpers.ts";

test("opportunity-create: POSTs /opportunities and links a contact via linked_contacts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true, id: 7 } }]);
  const out = await opportunityCreate.execute({
    name: "401k rollover",
    amount: "200000",
    contactId: 1,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/opportunities");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "401k rollover");
  assertEquals(body.linked_contacts, [{ contact_id: 1 }]);
  assertEquals(out, { success: true, id: 7 });
});

test("opportunity-create: is not idempotent — a retry creates a second opportunity", () => {
  assertEquals(opportunityCreate.idempotent, false);
});
