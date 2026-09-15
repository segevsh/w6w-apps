import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: POSTs (not PUT/PATCH) to /2.0/contact/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4 } }]);
  await action.execute!({
    contactId: 4,
    contactTypeId: 1,
    name1: "Acme AG",
    userId: 1,
    ownerId: 1,
    city: "Bern",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact/4");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name_1, "Acme AG");
  assertEquals(body.city, "Bern");
});
