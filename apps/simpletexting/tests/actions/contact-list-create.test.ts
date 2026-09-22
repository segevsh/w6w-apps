import { assertEquals } from "@std/assert";
import contactListCreate from "../../actions/contact-list-create.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("contact-list-create: POSTs the name and returns the new list's id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "507f191e810c19729de860ea" } }]);
  const result = await contactListCreate.execute({ name: "My New List" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists`);
  assertEquals(bodyOf(calls[0]), { name: "My New List" });
  assertEquals(result.id, "507f191e810c19729de860ea");
});

/**
 * The vendor's own sentence: "A list name containing less than 42 characters".
 * Enforced as a form validation, quoted verbatim in the hint.
 */
Deno.test("contact-list-create: the name field caps at the vendor's documented length", () => {
  const name = contactListCreate.params!.find((p) => p.key === "name");
  assertEquals(name?.required, true);
  assertEquals(name?.validation, { maxLength: 41 });
});

Deno.test("contact-list-create: is not idempotent — each call makes a new list", () => {
  assertEquals(contactListCreate.idempotent, false);
});
