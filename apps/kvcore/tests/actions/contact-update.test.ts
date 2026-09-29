import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs to /contact/{id} without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, email: "new@test.com" } }]);
  await contactUpdate.execute({ contact_id: "123", email: "new@test.com" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/123");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "new@test.com" });
  assertEquals("contact_id" in body, false);
});

Deno.test("contact-update: no field is required except contact_id", () => {
  const required = (contactUpdate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["contact_id"]);
});
