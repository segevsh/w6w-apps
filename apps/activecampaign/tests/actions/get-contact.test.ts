import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

test("get-contact: GETs /contacts/{id}", async () => {
  const body = { contact: { id: "42", email: "a@b.com" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ contactId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/3/contacts/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
