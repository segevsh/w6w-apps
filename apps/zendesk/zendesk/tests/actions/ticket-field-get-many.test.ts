import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-field-get-many.ts";

test("ticket-field-get-many: GETs /ticket_fields.json and takes no params", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket_fields: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/ticket_fields.json");
  assertEquals(action.params, []);
});
