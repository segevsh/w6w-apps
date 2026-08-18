import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

/** Resend's path parameter is documented as "The Contact ID or email address". */
Deno.test("contact-get: accepts an email address as the identifier", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c_1" } }], { display: {} });
  await action.execute!({ contact: "someone@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.resend.com/contacts/someone%40example.com");
});

Deno.test("contact-get: a blank identifier fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`contact`");
  assertEquals(calls.length, 0);
});
