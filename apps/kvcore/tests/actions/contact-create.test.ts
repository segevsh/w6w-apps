import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: posts to /contact and joins deal_type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, email: "a@b.com" } }]);
  const out = await contactCreate.execute(
    { first_name: "A", last_name: "B", email: "a@b.com", deal_type: ["buyer", "seller"] },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact");
  assertEquals(JSON.parse(calls[0].body!).deal_type, "buyer,seller");
  assertEquals(out, { id: 5, email: "a@b.com" });
});

Deno.test("contact-create: first_name, last_name and email are required", () => {
  const required = (contactCreate.params ?? [])
    .filter((p) => p.required)
    .map((p) => p.key);
  assertEquals(required.sort(), ["email", "first_name", "last_name"]);
});

Deno.test("contact-create: is not idempotent — kvCORE allows duplicate contacts", () => {
  assertEquals(contactCreate.idempotent, false);
});
