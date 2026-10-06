import { assertEquals } from "@std/assert";
import groupRemoveContacts from "../../actions/group-remove-contacts.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("group-remove-contacts: calls DELETE /contact-groups/3/contacts and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: ["2125551234"] }]);
  const result = await groupRemoveContacts.execute(
    { "id": "3", "phoneNumbers": "2125551234" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups/3/contacts`);
  assertEquals(queryOf(calls[0].url), { "phoneNumbers": "2125551234" });
  assertEquals(calls[0].body, null);
  assertEquals(result, { "result": ["2125551234"] });
});

Deno.test("group-remove-contacts: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: ["2125551234"] }]);
  await groupRemoveContacts.execute({ "id": "3", "phoneNumbers": "2125551234" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
