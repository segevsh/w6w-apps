import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { API_ROOT, bodyOf, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs the body to the contact's path and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "507f1f77bcf86cd799439011" } }]);
  const result = await contactUpdate.execute(
    {
      contactIdOrNumber: "3051234567",
      firstName: "John",
      lastName: "Doe",
      listIds: ["My First List"],
      listsReplacement: false,
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/api/contacts/3051234567`), true);
  assertEquals(bodyOf(calls[0]), {
    firstName: "John",
    lastName: "Doe",
    listIds: ["My First List"],
  });
  assertEquals(result.id, "507f1f77bcf86cd799439011");
});

/**
 * The vendor's own example sets `listsReplacement=false` to add a contact to a
 * new list "while remaining on the current one". That is the documented way to
 * grow membership instead of replacing it, and `false` has to survive to the
 * wire for it to work.
 */
Deno.test("contact-update: listsReplacement=false reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await contactUpdate.execute(
    { contactIdOrNumber: "3051234567", listIds: ["My First List"], listsReplacement: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { listsReplacement: "false" });
});

/** A PUT with nothing but the id is a no-op request, and refused before any call. */
Deno.test("contact-update: an empty body is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await contactUpdate.execute({ contactIdOrNumber: "3051234567" }, ctx);
  } catch (err) {
    threw = true;
    assertEquals(String(err).includes("Nothing to update"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

/**
 * `upsert` defaults to true on a PUT: an unknown phone number is CREATED rather
 * than rejected. That is a sharp edge worth a visible param.
 */
Deno.test("contact-update: upsert defaults on, and the hint says so", () => {
  const upsert = contactUpdate.params!.find((p) => p.key === "upsert");
  assertEquals(upsert?.default, true);
  assertEquals(upsert?.hint?.includes("creates a contact"), true);
});

Deno.test("contact-update: is idempotent — the same body twice is the same state", () => {
  assertEquals(contactUpdate.idempotent, true);
  assertEquals(contactUpdate.type, "perform");
});
