import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

test("delete-contact: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

test("delete-contact: DELETEs /contacts/{id} and logs a warning", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await action.execute({ contactId: 1 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/contacts/1");
  assertEquals(result, {});
  assertEquals(logs[0].level, "warn");
});
