import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETE /v1/contacts/{contactId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await contactDelete.execute({ contactId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { deleted: true, id: "42" });
});

Deno.test("contact-delete: declares type perform", () => {
  assertEquals(contactDelete.type, "perform");
  assertEquals(contactDelete.idempotent, true);
});

Deno.test("contact-delete: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactDelete.execute({ contactId: "42" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
