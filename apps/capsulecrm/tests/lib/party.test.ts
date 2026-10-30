import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { buildPartyBody } from "../../lib/party.ts";

test("buildPartyBody: person fields", () => {
  assertEquals(
    buildPartyBody({ type: "person", firstName: "Scott", lastName: "Spacey", jobTitle: "CD" }),
    { type: "person", firstName: "Scott", lastName: "Spacey", jobTitle: "CD" },
  );
});

test("buildPartyBody: organisation name and about", () => {
  assertEquals(
    buildPartyBody({ type: "organisation", name: "Acme", about: "A widget maker" }),
    { type: "organisation", name: "Acme", about: "A widget maker" },
  );
});

test("buildPartyBody: links to an existing organisation by id", () => {
  assertEquals(
    buildPartyBody({ firstName: "Jo", organisationId: 42 }),
    { firstName: "Jo", organisation: { id: 42 } },
  );
});

test("buildPartyBody: organisationId takes precedence over organisationName", () => {
  assertEquals(
    buildPartyBody({ organisationId: 42, organisationName: "Ignored" }),
    { organisation: { id: 42 } },
  );
});

test("buildPartyBody: falls back to organisationName when no id is given", () => {
  assertEquals(buildPartyBody({ organisationName: "Acme" }), { organisation: { name: "Acme" } });
});

test("buildPartyBody: owner/team nest as {id}", () => {
  assertEquals(buildPartyBody({ ownerId: 1, teamId: 2 }), { owner: { id: 1 }, team: { id: 2 } });
});

test("buildPartyBody: a single email/phone convenience nests as one-element arrays", () => {
  assertEquals(
    buildPartyBody({ email: "jo@acme.test", phone: "555-1234" }),
    { emailAddresses: [{ address: "jo@acme.test" }], phoneNumbers: [{ number: "555-1234" }] },
  );
});

test("buildPartyBody: blank strings are dropped, not sent as empty updates", () => {
  assertEquals(buildPartyBody({ firstName: "", about: "" }), {});
});

test("buildPartyBody: unset optional fields are omitted entirely (PUT-safe)", () => {
  assertEquals(buildPartyBody({}), {});
});
