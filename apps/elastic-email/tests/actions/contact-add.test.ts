import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-add: POST /contacts sends a one-element array and repeats listnames", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Email: "a@x.com" }] }]);
  const out = await action.execute({
    email: "a@x.com",
    firstName: "Ada",
    status: "Active",
    customFields: { city: "NY" },
    listNames: "News, VIP",
    consentIp: "1.2.3.4",
  }, ctx) as { contacts: unknown[] };
  assertEquals(out.contacts.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/contacts");
  assertEquals(new URL(calls[0].url).searchParams.getAll("listnames"), ["News", "VIP"]);
  assertEquals(JSON.parse(calls[0].body!), [{
    Email: "a@x.com",
    FirstName: "Ada",
    Status: "Active",
    CustomFields: { city: "NY" },
    Consent: { ConsentIP: "1.2.3.4" },
  }]);
});

Deno.test("contact-add: email only sends no query and no empty fields; email required", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ email: " a@x.com " }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body!), [{ Email: "a@x.com" }]);
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
