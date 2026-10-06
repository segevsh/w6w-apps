import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201 }]);
  const out = await action.execute!({ contactId: 8 }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts/8");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true, contactId: 8 });
  assertEquals(action.idempotent, true);
});

Deno.test("contact-delete: an error is thrown, not reported as deleted", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Contact not found" } }]);
  await assertRejects(
    async () => await action.execute!({ contactId: 8 }, ctx),
    Error,
    "Contact not found",
  );
});
