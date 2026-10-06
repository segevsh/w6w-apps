import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const result = { id: "c1", resourceUri: "https://api.lexware.io/v1/contacts/c1", version: 1 };

Deno.test("contact-create: a person customer is POSTed with version 0 and an empty role object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: result }]);
  const out = await action.execute({
    contactType: "person",
    customer: true,
    salutation: "Frau",
    firstName: "Inge",
    lastName: "Musterfrau",
    email: "inge@example.com",
    phone: "08000/1",
    street: "Hauptstr. 5",
    zip: "12345",
    city: "Musterort",
    countryCode: "de",
    note: "Notizen",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    version: 0,
    roles: { customer: {} },
    person: { salutation: "Frau", firstName: "Inge", lastName: "Musterfrau" },
    addresses: {
      billing: [{ street: "Hauptstr. 5", zip: "12345", city: "Musterort", countryCode: "DE" }],
    },
    emailAddresses: { business: ["inge@example.com"] },
    phoneNumbers: { business: ["08000/1"] },
    note: "Notizen",
  });
  assertEquals(out.id, "c1");
});

Deno.test("contact-create: a company vendor carries name and one contact person; extra merges on top", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: result }]);
  await action.execute({
    contactType: "company",
    vendor: true,
    companyName: "Testfirma",
    lastName: "Mustermann",
    extra: JSON.stringify({
      xRechnung: { buyerReference: "04011000-1234512345-35", vendorNumberAtCustomer: "7" },
    }),
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.roles, { vendor: {} });
  assertEquals(body.company, { name: "Testfirma", contactPersons: [{ lastName: "Mustermann" }] });
  assertEquals(body.xRechnung.buyerReference, "04011000-1234512345-35");
});

Deno.test("contact-create: validates role, names and address country before the network", async () => {
  const n = mockCtx();
  await assertRejects(
    async () => await action.execute({ contactType: "person", lastName: "X" }, n.ctx),
    Error,
    "role",
  );
  await assertRejects(
    async () => await action.execute({ contactType: "person", customer: true }, n.ctx),
    Error,
    "Last name",
  );
  await assertRejects(
    async () => await action.execute({ contactType: "company", customer: true }, n.ctx),
    Error,
    "Company name",
  );
  await assertRejects(
    async () =>
      await action.execute(
        { contactType: "person", customer: true, lastName: "X", city: "Y" },
        n.ctx,
      ),
    Error,
    "country code",
  );
  assertEquals(n.calls.length, 0);
  assertEquals(action.idempotent, false);
});
