import { assertEquals, assertRejects } from "@std/assert";
import updateContact from "../../actions/update-contact.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("update-contact: PUT sends partial=true by default so omitted fields survive", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ contact: { id: "c1" } }) }]);
  await updateContact.execute({ contactId: "c1", jobTitle: "CTO", tags: ["a"] }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/c1");
  assertEquals(queryOf(calls[0].url), { partial: "true" });
  assertEquals(bodyOf(calls[0]), { job_title: "CTO", tags: ["a"] });
});

Deno.test("update-contact: replace=true drops partial (vendor full-replace)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ contact: {} }) }]);
  await updateContact.execute({ contactId: "c1", lastName: "L", replace: true }, ctx);
  assertEquals(calls[0].url, "https://app.onepagecrm.com/api/v3/contacts/c1");
});

Deno.test("update-contact: an empty address_list is sent (it clears addresses)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ contact: {} }) }]);
  await updateContact.execute({ contactId: "c1", addressList: "[]", companyId: "co9" }, ctx);
  assertEquals(bodyOf(calls[0]), { address_list: [], company_id: "co9" });
});

Deno.test("update-contact: contactId is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(updateContact.execute({ jobTitle: "x" }, ctx)), Error);
});
