import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: sends filter[...] query params and repeats array filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await contactList.execute(
    { email: "test@test.com", leadtype: ["buyer", "renter"], includeArchived: true, limit: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/public/contacts");
  const q = queryOf(calls[0].url);
  assertEquals(q["filter[email]"], ["test@test.com"]);
  assertEquals(q["filter[leadtype][]"], ["buyer", "renter"]);
  assertEquals(q["includeArchived"], ["1"]);
  assertEquals(q["limit"], ["25"]);
  assertEquals((out as { total: number }).total, 1);
});

Deno.test("contact-list: with no input sends no filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
