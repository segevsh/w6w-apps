import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-update: PUT /v1/contacts/{contactId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 42, first_name: "Paco" } }]);
  const result = await contactUpdate.execute({
    contactId: "42",
    firstName: "Paco",
    lastName: "Merlo",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { first_name: "Paco", last_name: "Merlo" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 42, first_name: "Paco" });
});

Deno.test("contact-update: declares type perform", () => {
  assertEquals(contactUpdate.type, "perform");
  assertEquals(contactUpdate.idempotent, true);
});

Deno.test("contact-update: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactUpdate.execute({ contactId: "42", firstName: "Paco", lastName: "Merlo" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
