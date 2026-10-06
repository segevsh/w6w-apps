import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs a trimmed body with a nested address", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "cnt_new" }) }]);
  const out = await contactCreate.execute({
    funnelId: "f1",
    email: " jane@example.com ",
    firstName: "Jane",
    city: "Berlin",
    country: "DE",
    skipAutomationTrigger: true,
  }, ctx) as { data: { id: string } };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "jane@example.com",
    firstName: "Jane",
    address: { city: "Berlin", country: "DE" },
    skipAutomationTrigger: true,
  });
  assertEquals(out.data.id, "cnt_new");
});

Deno.test("contact-create: phone alone is enough; empty fields and empty address are omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "c" }) }]);
  await contactCreate.execute({ funnelId: "f", phone: "+4915", email: "", city: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { phone: "+4915" });
});

Deno.test("contact-create: refuses a contact with neither email nor phone, offline", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(contactCreate.execute({ funnelId: "f", firstName: "x" }, ctx)),
    Error,
    "either email or phone is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: is a non-idempotent perform and does not offer deprecated timezone", () => {
  assertEquals(contactCreate.idempotent, false);
  assertEquals(contactCreate.params!.some((p) => p.key === "timezone"), false);
});

Deno.test("contact-create: a 400 validation error surfaces", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "Invalid email format", status: 400 } }]);
  await assertRejects(
    () => Promise.resolve(contactCreate.execute({ funnelId: "f", email: "nope" }, ctx)),
    Error,
    "Perspective 400: Invalid email format",
  );
});
