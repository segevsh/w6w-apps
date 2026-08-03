import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-or-update-contact.ts";

Deno.test("create-or-update-contact: POSTs /v3/contacts/sign_up_form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact_id: "c1", action: "created" } }]);
  const out = await action.execute!({
    emailAddress: "a@b.test",
    listMemberships: ["l1"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/sign_up_form");
  assertEquals(out, { contact_id: "c1", action: "created" });
});

Deno.test("create-or-update-contact: sends email_address as a flat string, not an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test", listMemberships: ["l1"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address, "a@b.test");
  assertEquals(body.list_memberships, ["l1"]);
});

Deno.test("create-or-update-contact: sends a single street_address object and one phone_number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    emailAddress: "a@b.test",
    listMemberships: ["l1"],
    phoneNumber: "555-0100",
    streetAddress: { kind: "home", city: "London" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.phone_number, "555-0100");
  assertEquals(body.street_address, { kind: "home", city: "London" });
  assertEquals("phone_numbers" in body, false);
  assertEquals("street_addresses" in body, false);
});

Deno.test("create-or-update-contact: maps the remaining optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    emailAddress: "a@b.test",
    listMemberships: ["l1"],
    firstName: "Ada",
    lastName: "Lovelace",
    jobTitle: "Analyst",
    companyName: "Acme",
    birthdayMonth: 12,
    birthdayDay: 10,
    anniversary: "2020-12-10",
    customFields: [{ custom_field_id: "f1", value: "x" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Ada");
  assertEquals(body.last_name, "Lovelace");
  assertEquals(body.job_title, "Analyst");
  assertEquals(body.company_name, "Acme");
  assertEquals(body.birthday_month, 12);
  assertEquals(body.birthday_day, 10);
  assertEquals(body.anniversary, "2020-12-10");
  assertEquals(body.custom_fields, [{ custom_field_id: "f1", value: "x" }]);
});

Deno.test("create-or-update-contact: sends only the two required keys when nothing else is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test", listMemberships: ["l1"] }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), [
    "email_address",
    "list_memberships",
  ]);
});

Deno.test("create-or-update-contact: is idempotent — the upsert replays cleanly", () => {
  assertEquals(action.idempotent, true);
});
