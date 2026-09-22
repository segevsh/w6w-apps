import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs the changed details", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 501, firstName: "Jane" } }]);
  await contactUpdate.execute({ contactId: 501, position: "Project Manager" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/contacts/501");
  assertEquals(bodyOf(calls[0]), { position: "Project Manager" });
});

Deno.test("contact-update: read-only fields are not exposed as params", () => {
  const keys = (contactUpdate.params ?? []).map((p) => p.key);
  for (const readonly of ["active", "companyId", "notes"]) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
