import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-create: POST /v1/contacts/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 9, first_name: "Ada" } }]);
  const result = await contactCreate.execute({
    firstName: "Ada",
    email: "ada@example.com",
    tags: '["a","b"]',
    gdprAccept: true,
    extra: { custom_fields: [] },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), {
    custom_fields: [],
    first_name: "Ada",
    email: "ada@example.com",
    tags: ["a", "b"],
    gdpr_accept: true,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 9, first_name: "Ada" });
});

Deno.test("contact-create: declares type perform", () => {
  assertEquals(contactCreate.type, "perform");
  assertEquals(contactCreate.idempotent, false);
});

Deno.test("contact-create: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactCreate.execute({
      firstName: "Ada",
      email: "ada@example.com",
      tags: '["a","b"]',
      gdprAccept: true,
      extra: { custom_fields: [] },
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
