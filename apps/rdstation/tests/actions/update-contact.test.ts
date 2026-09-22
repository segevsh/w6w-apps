import { assertEquals } from "@std/assert";

import updateContact from "../../actions/update-contact.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("update-contact: PUT /contacts/{id} with the same body shape as create", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "c1" } }]);

  await updateContact.execute(
    { contactId: "c1", name: "Ada L.", email: "ada@example.com", organizationId: "org1" },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/contacts/c1`);
  assertEquals(bodyOf(calls[0]), {
    contact: {
      name: "Ada L.",
      emails: [{ email: "ada@example.com" }],
      organization_id: "org1",
    },
  });
});

Deno.test("update-contact: the id is URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);

  await updateContact.execute({ contactId: "a b" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/contacts/a%20b`);
});

Deno.test("update-contact: contactId is required and the action is idempotent", () => {
  const param = updateContact.params?.find((p) => p.key === "contactId");
  assertEquals(param?.required, true);
  assertEquals(updateContact.idempotent, true);
  assertEquals(updateContact.type, "perform");
});
