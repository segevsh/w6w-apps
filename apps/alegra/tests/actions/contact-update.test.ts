import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUT /contacts/:id sends only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "8" } }]);
  await contactUpdate.execute({
    id: "8",
    email: "new@x.com",
    status: "inactive",
    types: ["provider"],
    city: "Lima",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/8");
  assertEquals(bodyOf(calls[0]), {
    email: "new@x.com",
    status: "inactive",
    type: ["provider"],
    address: { city: "Lima" },
  });
});

Deno.test("contact-update: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => contactUpdate.execute({ id: "" }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: is declared idempotent", () => {
  assertEquals(contactUpdate.idempotent, true);
});
