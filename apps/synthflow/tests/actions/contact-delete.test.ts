import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETE /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  assertEquals(await contactDelete.execute({ contact_id: "ct1" }, ctx), { status: "ok" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/contacts/ct1");
});
