import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 963410, name: "John Doe" } }], conn);
  const out = await action.execute!({ id: 963410 }, ctx);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/contacts/963410");
  assertEquals(out.contact, { id: 963410, name: "John Doe" });
});

test("contact-get: type is read, and resource is contact", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "contact");
});
