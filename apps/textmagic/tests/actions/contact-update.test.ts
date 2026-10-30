import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-update: PUTs /contacts/{id}/normalized without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 27074, href: "/api/v2/contacts/27074" },
  }]);
  const out = await contactUpdate.execute({ id: 27074, firstName: "Chuck" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/27074/normalized");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Chuck" });
  assertEquals(out, { id: 27074, href: "/api/v2/contacts/27074" });
});

test("contact-update: is idempotent", () => {
  assertEquals(contactUpdate.idempotent, true);
});
