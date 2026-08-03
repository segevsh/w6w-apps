import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { bodyOf, doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs a JSON:API document with the site relationship", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("5") }]);
  await contactCreate.execute(
    { siteId: "111", name: "Jo", email: "jo@x.com", phoneNumber: "555" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/contacts");

  const body = bodyOf(calls[0]) as {
    data: {
      type: string;
      attributes: Record<string, unknown>;
      relationships: { site: { data: { id: string; type: string } } };
    };
  };
  assertEquals(body.data.type, "contacts");
  assertEquals(body.data.attributes.name, "Jo");
  assertEquals(body.data.attributes.email, "jo@x.com");
  assertEquals(body.data.attributes.phone_number, "555");
  // Kajabi's schema requires all three of type, attributes and relationships.
  assertEquals(body.data.relationships.site.data, { id: "111", type: "sites" });
});

Deno.test("contact-create: unfilled attributes are omitted, not sent blank", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("5") }]);
  await contactCreate.execute({ siteId: "111", name: "Jo", email: "jo@x.com" }, ctx);
  const attrs = (bodyOf(calls[0]) as { data: { attributes: Record<string, unknown> } })
    .data.attributes;
  assertEquals(Object.keys(attrs).sort(), ["email", "name"]);
});

Deno.test("contact-create: custom fields merge into attributes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("5") }]);
  await contactCreate.execute({
    siteId: "111",
    name: "Jo",
    email: "jo@x.com",
    customFields: '{"custom_1": "Referred"}',
  }, ctx);
  const attrs = (bodyOf(calls[0]) as { data: { attributes: Record<string, unknown> } })
    .data.attributes;
  assertEquals(attrs.custom_1, "Referred");
});

Deno.test("contact-create: malformed custom-field JSON fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactCreate.execute(
        { siteId: "111", name: "Jo", email: "jo@x.com", customFields: "nope" },
        ctx,
      );
    },
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

/**
 * Kajabi annotates `external_user_id` as *"Supported once contact is granted an
 * offer or makes a purchase"* — it silently does nothing at creation time, so
 * it is deliberately not offered here. It IS offered on `contact-update`.
 */
Deno.test("contact-create: does not offer external_user_id, which is inert at creation", () => {
  const keys = contactCreate.params!.map((p) => p.key);
  assertEquals(keys.includes("externalUserId"), false);
});

/** A contact cannot exist without a site, so the param cannot be optional. */
Deno.test("contact-create: the site is required here, unlike on the list actions", () => {
  const site = contactCreate.params!.find((p) => p.key === "siteId")!;
  assertEquals(site.required, true);
});

Deno.test("contact-create: is not idempotent — a retry creates a second contact", () => {
  assertEquals(contactCreate.idempotent, false);
});
