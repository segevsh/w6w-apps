import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs the mapped body to /contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, email: "reader@example.com" } }]);
  const out = await contactCreate.execute(
    { email: "reader@example.com", firstName: "Ada", lastName: "Lovelace", lists: [1, 2] },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    email: "reader@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    lists: [1, 2],
  });
  assertEquals(out.id, 3);
});

Deno.test("contact-create: absent optional fields are dropped, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactCreate.execute({ email: "a@b.c" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { email: "a@b.c" });
});

Deno.test("contact-create: custom fields are passed through as {name, value}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactCreate.execute(
    { email: "a@b.c", contactFields: [{ name: "company", value: "Acme" }] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}").contact_fields, [
    { name: "company", value: "Acme" },
  ]);
});

Deno.test("contact-create: is not marked idempotent — a retry must not duplicate", () => {
  assertEquals(contactCreate.idempotent, false);
});
