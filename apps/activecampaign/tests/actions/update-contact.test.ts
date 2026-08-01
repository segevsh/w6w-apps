import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PUTs /contacts/{id} with only the set fields", async () => {
  const body = { contact: { id: "42" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ contactId: "42", lastName: "Lovelace" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/3/contacts/42");
  assertEquals(JSON.parse(calls[0].body!), { contact: { lastName: "Lovelace" } });
  assertEquals(result, body);
});
