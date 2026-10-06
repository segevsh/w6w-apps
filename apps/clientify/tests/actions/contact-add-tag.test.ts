import { assertEquals } from "@std/assert";
import contactAddTag from "../../actions/contact-add-tag.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-add-tag: POST /v1/contacts/{contactId}/tags/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { name: "vip" } }]);
  const result = await contactAddTag.execute({ contactId: "42", name: "vip" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/42/tags/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { name: "vip" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { name: "vip" });
});

Deno.test("contact-add-tag: declares type perform", () => {
  assertEquals(contactAddTag.type, "perform");
  assertEquals(contactAddTag.idempotent, true);
});

Deno.test("contact-add-tag: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactAddTag.execute({ contactId: "42", name: "vip" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
