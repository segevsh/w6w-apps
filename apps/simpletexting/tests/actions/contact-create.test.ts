import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { API_ROOT, bodyOf, mockCtx, queryOf } from "../_helpers.ts";

const CREATED = { id: "507f1f77bcf86cd799439011" };

Deno.test("contact-create: POSTs the contact body and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  const result = await contactCreate.execute(
    {
      contactPhone: "1234567890",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      birthday: "1985-05-15",
      customFields: { zipcode: "12345" },
      comment: "VIP client",
      listIds: ["507f191e810c19729de860ea", "My First List"],
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/api/contacts`), true);
  assertEquals(bodyOf(calls[0]), {
    contactPhone: "1234567890",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    birthday: "1985-05-15",
    customFields: { zipcode: "12345" },
    comment: "VIP client",
    listIds: ["507f191e810c19729de860ea", "My First List"],
  });
  assertEquals(result.id, CREATED.id);
});

/**
 * Both query parameters default to `true` in the schema. Sending them explicitly
 * is what keeps what the request does equal to what the form shows.
 */
Deno.test("contact-create: the two on-by-default query flags are visible params, sent when untouched", async () => {
  assertEquals(contactCreate.params!.find((p) => p.key === "upsert")?.default, true);
  assertEquals(contactCreate.params!.find((p) => p.key === "listsReplacement")?.default, true);

  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute(
    { contactPhone: "1234567890", upsert: true, listsReplacement: false },
    ctx,
  );
  // `false` survives compaction — that is the whole point of sending it.
  assertEquals(queryOf(calls[0].url), { upsert: "true", listsReplacement: "false" });
});

/**
 * `SingleContactUpdate` marks no field required. This action requires a phone
 * number anyway, and says why: a contact nothing can be texted to is not
 * addressable anywhere else in this API.
 */
Deno.test("contact-create: requires a phone number, unlike the schema", () => {
  const phone = contactCreate.params!.find((p) => p.key === "contactPhone");
  assertEquals(phone?.required, true);
  assertEquals(phone?.hint?.includes("schema marks no field required"), true);
});

Deno.test("contact-create: a comma-separated list of list names still becomes an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactCreate.execute(
    { contactPhone: "1234567890", listIds: "My First List, 507f191e810c19729de860ea" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).listIds, ["My First List", "507f191e810c19729de860ea"]);
});

Deno.test("contact-create: is a perform, and not idempotent", () => {
  assertEquals(contactCreate.type, "perform");
  assertEquals(contactCreate.idempotent, false);
});
