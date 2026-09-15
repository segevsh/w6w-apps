import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs to /2.0/contact with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 4, nr: "K-0001" } }]);
  const result = await action.execute!({
    contactTypeId: 1,
    name1: "Acme AG",
    name2: "Zweigstelle",
    userId: 1,
    ownerId: 1,
    mail: "info@acme.ch",
    city: "Zürich",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contact_type_id, 1);
  assertEquals(body.name_1, "Acme AG");
  assertEquals(body.name_2, "Zweigstelle");
  assertEquals(body.user_id, 1);
  assertEquals(body.owner_id, 1);
  assertEquals(body.mail, "info@acme.ch");
  assertEquals(body.city, "Zürich");
  assertEquals(result, { id: 4, nr: "K-0001" });
});

Deno.test("contact-create: omits unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 4 } }]);
  await action.execute!({ contactTypeId: 2, name1: "Muster", userId: 1, ownerId: 1 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("mail" in body, false);
  assertEquals("city" in body, false);
});
