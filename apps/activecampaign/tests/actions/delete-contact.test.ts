import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

test("delete-contact: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ status: 200, body: {} }]);
  await action.execute({ contactId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/3/contacts/42");
});

test("delete-contact: tolerates a 204 with no body", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 204 }]);
  const result = await action.execute({ contactId: "42" }, ctx);
  assertEquals(result, undefined);
});
