import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PUTs /v3/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: "c1" } }]);
  await action.execute!({ contactId: "c1", emailAddress: "a@b.test" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
});

Deno.test("update-contact: always sends email_address and update_source", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", emailAddress: "a@b.test" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address, { address: "a@b.test" });
  assertEquals(body.update_source, "Account");
});

Deno.test("update-contact: honours an explicit update_source", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    contactId: "c1",
    emailAddress: "a@b.test",
    updateSource: "Contact",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).update_source, "Contact");
});

Deno.test("update-contact: maps every optional field to its snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    contactId: "c1",
    emailAddress: "a@b.test",
    permissionToSend: "implicit",
    firstName: "Ada",
    lastName: "Lovelace",
    jobTitle: "Analyst",
    companyName: "Acme",
    birthdayMonth: 12,
    birthdayDay: 10,
    anniversary: "2020-12-10",
    listMemberships: ["l1"],
    taggings: ["t1"],
    customFields: [{ custom_field_id: "f1", value: "x" }],
    phoneNumbers: [{ phone_number: "555" }],
    streetAddresses: [{ kind: "work" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address.permission_to_send, "implicit");
  assertEquals(body.first_name, "Ada");
  assertEquals(body.last_name, "Lovelace");
  assertEquals(body.job_title, "Analyst");
  assertEquals(body.company_name, "Acme");
  assertEquals(body.birthday_month, 12);
  assertEquals(body.birthday_day, 10);
  assertEquals(body.anniversary, "2020-12-10");
  assertEquals(body.list_memberships, ["l1"]);
  assertEquals(body.taggings, ["t1"]);
  assertEquals(body.custom_fields, [{ custom_field_id: "f1", value: "x" }]);
  assertEquals(body.phone_numbers, [{ phone_number: "555" }]);
  assertEquals(body.street_addresses, [{ kind: "work" }]);
});

Deno.test("update-contact: omits sub-resources entirely when not supplied, so they survive", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", emailAddress: "a@b.test" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("list_memberships" in body, false);
  assertEquals("taggings" in body, false);
  assertEquals("custom_fields" in body, false);
});

Deno.test("update-contact: is idempotent — the same full representation replays cleanly", () => {
  assertEquals(action.idempotent, true);
});
