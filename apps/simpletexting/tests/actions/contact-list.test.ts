import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const CONTACT = {
  contactId: "507f1f77bcf86cd799439011",
  contactPhone: "1234567890",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  lists: [{ id: "507f191e810c19729de860ea", name: "My First List" }],
  subscriptionStatus: "OPT_IN",
  updateSource: "PUBLIC_API",
};

Deno.test("contact-list: reads the contacts page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CONTACT], { totalElements: 1 }) }]);
  const result = await contactList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/contacts`);
  assertEquals(result.content, [CONTACT]);
});

Deno.test("contact-list: forwards since and direction verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactList.execute(
    { since: "2021-04-28T23:20:08.489Z", direction: "ASC", page: 1, size: 2 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    since: "2021-04-28T23:20:08.489Z",
    direction: "ASC",
    page: "1",
    size: "2",
  });
});

/**
 * The vendor's parameter text spells the values ASC/DESC while its own schema
 * default and example URL are lowercase `desc`. The schema declares no enum, so
 * the value is passed through rather than normalised — and the param is a plain
 * string for exactly that reason.
 */
Deno.test("contact-list: direction is a passthrough string, not a picker the server might reject", () => {
  const direction = contactList.params!.find((p) => p.key === "direction");
  assertEquals(direction?.type, "string");
  assertEquals(direction?.default, undefined);
  assertEquals(direction?.hint?.includes("ASC/DESC"), true);
});

Deno.test("contact-list: is a search action grouped under contact", () => {
  assertEquals(contactList.type, "search");
  assertEquals(contactList.resource, "contact");
});
