import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-suppression-get.ts";

/** Suppression outranks subscription — it is why a "subscribed" contact gets nothing. */
Deno.test("contact-suppression-get: queries by email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { suppressed: true, reason: "bounce" } }]);
  const result = await action.execute!({ email: "ada@example.com" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/suppression");
  assertEquals(new URL(calls[0].url).searchParams.get("email"), "ada@example.com");
  assertEquals(result.suppressed, true);
});

Deno.test("contact-suppression-get: an email is required, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`email` is required");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("bounce"), action.description);
});
