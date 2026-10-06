import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: GET /v1/contacts/{contactId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 42, first_name: "Ada" } }]);
  const result = await contactGet.execute({ contactId: "42" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: 42, first_name: "Ada" });
});

Deno.test("contact-get: declares type read", () => {
  assertEquals(contactGet.type, "read");
});

Deno.test("contact-get: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactGet.execute({ contactId: "42" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
