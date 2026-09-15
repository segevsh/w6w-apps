import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PATCHes /contacts/people/:id with only provided fields", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 4, workEmail: "new@example.com" } }]);
  await action.execute({ contactId: 4, workEmail: "new@example.com" }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/contacts/people/4");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { work_email: "new@example.com" });
});
